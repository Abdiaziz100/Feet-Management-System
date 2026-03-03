from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, Vehicle, Driver, Trip, Fuel, Maintenance, User, UserSession, SecurityLog, AuditLog
from auth import (
    generate_tokens, verify_token, require_auth, require_admin, 
    rate_limit_check, log_security_event, audit_log, validate_password,
    get_client_ip, AuditLogger
)
from werkzeug.security import generate_password_hash, check_password_hash
import os
import json
import secrets
import pyotp
import qrcode
from io import BytesIO
import base64
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=['http://localhost:5173'])

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Create tables and default users
with app.app_context():
    db.create_all()
    
    # Create default admin user if not exists
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            password=generate_password_hash('Admin@123'),
            email='admin@fleetke.com',
            role='admin',
            is_active=True,
            is_verified=True
        )
        db.session.add(admin)
        
        # Create sample users with different roles
        manager = User(
            username='manager',
            password=generate_password_hash('Manager@123'),
            email='manager@fleetke.com',
            role='manager',
            is_active=True,
            is_verified=True
        )
        db.session.add(manager)
        
        driver = User(
            username='driver',
            password=generate_password_hash('Driver@123'),
            email='driver@fleetke.com',
            role='driver',
            is_active=True,
            is_verified=True
        )
        db.session.add(driver)
        
        db.session.commit()

# ---------- ENHANCED AUTHENTICATION ----------

@app.route("/auth/login", methods=["POST"])
def login():
    # Rate limiting check
    rate_check = rate_limit_check()
    if rate_check:
        return rate_check
    
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    mfa_code = data.get("mfa_code", "")
    
    if not username or not password:
        return jsonify(error="Username and password required"), 400
    
    user = User.query.filter_by(username=username).first()
    client_ip = get_client_ip()
    
    if not user or not check_password_hash(user.password, password):
        # Log failed login attempt
        log_security_event('failed_login', user.id if user else None, {
            'username': username,
            'reason': 'invalid_credentials'
        })
        
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.utcnow() + timedelta(minutes=15)
            db.session.commit()
        
        return jsonify(error="Invalid credentials"), 401
    
    # Check if account is locked
    if user.is_locked():
        log_security_event('login_blocked', user.id, {'reason': 'account_locked'})
        return jsonify(error="Account is locked. Try again later."), 423
    
    # Check if account is active
    if not user.is_active:
        log_security_event('login_blocked', user.id, {'reason': 'account_inactive'})
        return jsonify(error="Account is inactive"), 403
    
    # MFA verification if enabled
    if user.mfa_enabled:
        if not mfa_code:
            return jsonify(error="MFA code required", mfa_required=True), 200
        
        totp = pyotp.TOTP(user.mfa_secret)
        if not totp.verify(mfa_code):
            log_security_event('mfa_failed', user.id)
            return jsonify(error="Invalid MFA code"), 401
    
    # Successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    
    # Generate tokens
    access_token, refresh_token = generate_tokens(user.id, user.username, user.role)
    
    # Create session record
    session = UserSession(
        user_id=user.id,
        session_token=refresh_token,
        ip_address=client_ip,
        user_agent=request.headers.get('User-Agent', ''),
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.session.add(session)
    db.session.commit()
    
    # Log successful login
    log_security_event('login_success', user.id)
    
    return jsonify(
        success=True,
        access_token=access_token,
        refresh_token=refresh_token,
        user=user.to_dict(),
        expires_in=24 * 3600  # 24 hours in seconds
    )

@app.route("/auth/refresh", methods=["POST"])
def refresh_token():
    data = request.json
    refresh_token = data.get("refresh_token")
    
    if not refresh_token:
        return jsonify(error="Refresh token required"), 400
    
    # Verify refresh token
    payload = verify_token(refresh_token, 'refresh')
    if not payload:
        return jsonify(error="Invalid refresh token"), 401
    
    # Check if session exists and is active
    session = UserSession.query.filter_by(
        session_token=refresh_token,
        is_active=True
    ).first()
    
    if not session or session.expires_at < datetime.utcnow():
        return jsonify(error="Session expired"), 401
    
    user = User.query.get(payload['user_id'])
    if not user or not user.is_active:
        return jsonify(error="User not found or inactive"), 401
    
    # Generate new access token
    access_token, _ = generate_tokens(user.id, user.username, user.role)
    
    return jsonify(
        access_token=access_token,
        expires_in=24 * 3600
    )

@app.route("/auth/logout", methods=["POST"])
@require_auth()
def logout():
    data = request.json
    refresh_token = data.get("refresh_token")
    
    if refresh_token:
        # Deactivate session
        session = UserSession.query.filter_by(session_token=refresh_token).first()
        if session:
            session.is_active = False
            db.session.commit()
    
    log_security_event('logout', request.current_user['id'])
    return jsonify(message="Logged out successfully")

@app.route("/auth/change-password", methods=["POST"])
@require_auth()
def change_password():
    data = request.json
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    
    user = User.query.get(request.current_user['id'])
    
    if not check_password_hash(user.password, current_password):
        log_security_event('password_change_failed', user.id, {'reason': 'wrong_current_password'})
        return jsonify(error="Current password is incorrect"), 400
    
    # Validate new password
    is_valid, message = validate_password(new_password)
    if not is_valid:
        return jsonify(error=message), 400
    
    user.password = generate_password_hash(new_password)
    user.password_changed_at = datetime.utcnow()
    
    # Invalidate all existing sessions
    UserSession.query.filter_by(user_id=user.id).update({'is_active': False})
    
    db.session.commit()
    
    log_security_event('password_changed', user.id)
    AuditLogger.log_action('UPDATE', 'user_password', user.id)
    
    return jsonify(message="Password changed successfully")

@app.route("/auth/setup-mfa", methods=["POST"])
@require_auth()
def setup_mfa():
    user = User.query.get(request.current_user['id'])
    
    if user.mfa_enabled:
        return jsonify(error="MFA already enabled"), 400
    
    # Generate secret
    secret = pyotp.random_base32()
    user.mfa_secret = secret
    
    # Generate QR code
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.username,
        issuer_name="Fleet Management System"
    )
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    qr_code = base64.b64encode(buffer.getvalue()).decode()
    
    db.session.commit()
    
    return jsonify(
        secret=secret,
        qr_code=f"data:image/png;base64,{qr_code}",
        backup_codes=[]  # In production, generate backup codes
    )

@app.route("/auth/verify-mfa", methods=["POST"])
@require_auth()
def verify_mfa():
    data = request.json
    mfa_code = data.get("mfa_code", "")
    
    user = User.query.get(request.current_user['id'])
    
    if not user.mfa_secret:
        return jsonify(error="MFA not set up"), 400
    
    totp = pyotp.TOTP(user.mfa_secret)
    if not totp.verify(mfa_code):
        return jsonify(error="Invalid MFA code"), 400
    
    user.mfa_enabled = True
    db.session.commit()
    
    log_security_event('mfa_enabled', user.id)
    
    return jsonify(message="MFA enabled successfully")

@app.route("/auth/disable-mfa", methods=["POST"])
@require_auth()
def disable_mfa():
    data = request.json
    password = data.get("password", "")
    
    user = User.query.get(request.current_user['id'])
    
    if not check_password_hash(user.password, password):
        return jsonify(error="Password required to disable MFA"), 400
    
    user.mfa_enabled = False
    user.mfa_secret = None
    db.session.commit()
    
    log_security_event('mfa_disabled', user.id)
    
    return jsonify(message="MFA disabled successfully")

# ---------- USER MANAGEMENT (Admin Only) ----------

@app.route("/admin/users", methods=["GET"])
@require_admin
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@app.route("/admin/users", methods=["POST"])
@require_admin
def create_user():
    data = request.json
    
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    role = data.get("role", "user")
    
    if not all([username, email, password]):
        return jsonify(error="Username, email, and password required"), 400
    
    # Validate password
    is_valid, message = validate_password(password)
    if not is_valid:
        return jsonify(error=message), 400
    
    # Check for existing user
    if User.query.filter_by(username=username).first():
        return jsonify(error="Username already exists"), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify(error="Email already exists"), 400
    
    user = User(
        username=username,
        email=email,
        password=generate_password_hash(password),
        role=role,
        is_active=True,
        is_verified=True
    )
    
    db.session.add(user)
    db.session.commit()
    
    AuditLogger.log_action('CREATE', 'user', request.current_user['id'], {
        'created_user_id': user.id,
        'username': username,
        'role': role
    })
    
    return jsonify(message="User created successfully", user=user.to_dict()), 201

@app.route("/admin/users/<int:user_id>", methods=["PUT"])
@require_admin
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify(error="User not found"), 404
    
    data = request.json
    old_values = user.to_dict()
    
    if 'role' in data:
        user.role = data['role']
    if 'is_active' in data:
        user.is_active = data['is_active']
    if 'is_verified' in data:
        user.is_verified = data['is_verified']
    
    user.updated_at = datetime.utcnow()
    db.session.commit()
    
    AuditLogger.log_action('UPDATE', 'user', request.current_user['id'], {
        'updated_user_id': user_id,
        'old_values': old_values,
        'new_values': user.to_dict()
    })
    
    return jsonify(message="User updated successfully")

@app.route("/admin/users/<int:user_id>/reset-password", methods=["POST"])
@require_admin
def reset_user_password(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify(error="User not found"), 404
    
    # Generate temporary password
    temp_password = secrets.token_urlsafe(12)
    user.password = generate_password_hash(temp_password)
    user.password_changed_at = datetime.utcnow()
    
    # Force password change on next login
    user.failed_login_attempts = 0
    user.locked_until = None
    
    # Invalidate all sessions
    UserSession.query.filter_by(user_id=user_id).update({'is_active': False})
    
    db.session.commit()
    
    log_security_event('password_reset_admin', user_id, {'reset_by': request.current_user['id']})
    
    return jsonify(
        message="Password reset successfully",
        temporary_password=temp_password
    )

# ---------- SECURITY MONITORING ----------

@app.route("/admin/security/logs", methods=["GET"])
@require_admin
def get_security_logs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    logs = SecurityLog.query.order_by(SecurityLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'logs': [{
            'id': log.id,
            'user_id': log.user_id,
            'username': log.user.username if log.user else 'Unknown',
            'event_type': log.event_type,
            'ip_address': log.ip_address,
            'details': json.loads(log.details) if log.details else {},
            'created_at': log.created_at.isoformat()
        } for log in logs.items],
        'total': logs.total,
        'pages': logs.pages,
        'current_page': page
    })

@app.route("/admin/security/audit", methods=["GET"])
@require_admin
def get_audit_logs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    logs = AuditLog.query.order_by(AuditLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'logs': [{
            'id': log.id,
            'user_id': log.user_id,
            'username': log.user.username,
            'action': log.action,
            'resource': log.resource,
            'resource_id': log.resource_id,
            'ip_address': log.ip_address,
            'created_at': log.created_at.isoformat()
        } for log in logs.items],
        'total': logs.total,
        'pages': logs.pages,
        'current_page': page
    })

@app.route("/admin/security/sessions", methods=["GET"])
@require_admin
def get_active_sessions():
    sessions = UserSession.query.filter_by(is_active=True).filter(
        UserSession.expires_at > datetime.utcnow()
    ).all()
    
    return jsonify([{
        'id': session.id,
        'user_id': session.user_id,
        'username': session.user.username,
        'ip_address': session.ip_address,
        'user_agent': session.user_agent,
        'created_at': session.created_at.isoformat(),
        'expires_at': session.expires_at.isoformat()
    } for session in sessions])

@app.route("/admin/security/sessions/<int:session_id>", methods=["DELETE"])
@require_admin
def terminate_session(session_id):
    session = UserSession.query.get(session_id)
    if not session:
        return jsonify(error="Session not found"), 404
    
    session.is_active = False
    db.session.commit()
    
    log_security_event('session_terminated', session.user_id, {
        'terminated_by': request.current_user['id'],
        'session_id': session_id
    })
    
    return jsonify(message="Session terminated successfully")

if __name__ == "__main__":
    app.run(debug=True, port=5002)