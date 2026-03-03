import jwt
import secrets
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import re
import time
from collections import defaultdict

class SecurityConfig:
    """Security configuration and constants"""
    JWT_EXPIRATION_HOURS = 24
    REFRESH_TOKEN_DAYS = 7
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = 900  # 15 minutes
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_COMPLEXITY = True
    SESSION_TIMEOUT = 3600  # 1 hour

class RateLimiter:
    """Simple in-memory rate limiter"""
    def __init__(self):
        self.attempts = defaultdict(list)
        self.lockouts = {}
    
    def is_locked_out(self, identifier):
        if identifier in self.lockouts:
            if time.time() < self.lockouts[identifier]:
                return True
            else:
                del self.lockouts[identifier]
        return False
    
    def add_attempt(self, identifier):
        now = time.time()
        # Clean old attempts (older than 1 hour)
        self.attempts[identifier] = [
            attempt for attempt in self.attempts[identifier] 
            if now - attempt < 3600
        ]
        self.attempts[identifier].append(now)
        
        if len(self.attempts[identifier]) >= SecurityConfig.MAX_LOGIN_ATTEMPTS:
            self.lockouts[identifier] = now + SecurityConfig.LOCKOUT_DURATION
            return True
        return False

# Global rate limiter instance
rate_limiter = RateLimiter()

def validate_password(password):
    """Validate password complexity"""
    if len(password) < SecurityConfig.PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {SecurityConfig.PASSWORD_MIN_LENGTH} characters"
    
    if not SecurityConfig.PASSWORD_COMPLEXITY:
        return True, "Valid"
    
    # Check complexity requirements
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, "Valid"

def generate_tokens(user_id, username, role='user'):
    """Generate JWT access and refresh tokens"""
    now = datetime.utcnow()
    
    # Access token payload
    access_payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'iat': now,
        'exp': now + timedelta(hours=SecurityConfig.JWT_EXPIRATION_HOURS),
        'type': 'access'
    }
    
    # Refresh token payload
    refresh_payload = {
        'user_id': user_id,
        'username': username,
        'iat': now,
        'exp': now + timedelta(days=SecurityConfig.REFRESH_TOKEN_DAYS),
        'type': 'refresh',
        'jti': secrets.token_urlsafe(32)  # Unique token ID
    }
    
    access_token = jwt.encode(access_payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    
    return access_token, refresh_token

def verify_token(token, token_type='access'):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        
        if payload.get('type') != token_type:
            return None
        
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_client_ip():
    """Get client IP address"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr

def require_auth(roles=None):
    """Decorator for JWT authentication with optional role checking"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            token = None
            
            # Get token from Authorization header
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
            
            if not token:
                return jsonify({'error': 'Authentication token required'}), 401
            
            # Verify token
            payload = verify_token(token)
            if not payload:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            # Check role if specified
            if roles and payload.get('role') not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            # Add user info to request context
            request.current_user = {
                'id': payload['user_id'],
                'username': payload['username'],
                'role': payload.get('role', 'user')
            }
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_admin(f):
    """Decorator requiring admin role"""
    return require_auth(['admin'])(f)

def rate_limit_check():
    """Check rate limiting for current request"""
    client_ip = get_client_ip()
    
    if rate_limiter.is_locked_out(client_ip):
        return jsonify({
            'error': 'Too many failed attempts. Account locked.',
            'lockout_duration': SecurityConfig.LOCKOUT_DURATION
        }), 429
    
    return None

def log_security_event(event_type, user_id=None, details=None):
    """Log security events (in production, use proper logging)"""
    timestamp = datetime.utcnow().isoformat()
    client_ip = get_client_ip()
    
    log_entry = {
        'timestamp': timestamp,
        'event_type': event_type,
        'user_id': user_id,
        'client_ip': client_ip,
        'details': details or {}
    }
    
    # In production, write to secure log file or security monitoring system
    print(f"SECURITY EVENT: {log_entry}")

class AuditLogger:
    """Audit logging for user actions"""
    
    @staticmethod
    def log_action(action, resource, user_id, details=None):
        """Log user action for audit trail"""
        timestamp = datetime.utcnow().isoformat()
        client_ip = get_client_ip()
        
        audit_entry = {
            'timestamp': timestamp,
            'action': action,
            'resource': resource,
            'user_id': user_id,
            'client_ip': client_ip,
            'details': details or {}
        }
        
        # In production, store in audit database table
        print(f"AUDIT LOG: {audit_entry}")

def audit_log(action, resource):
    """Decorator for automatic audit logging"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = getattr(request, 'current_user', {}).get('id')
            
            # Execute the function
            result = f(*args, **kwargs)
            
            # Log the action if successful (status code < 400)
            if hasattr(result, 'status_code'):
                if result.status_code < 400:
                    AuditLogger.log_action(action, resource, user_id)
            else:
                AuditLogger.log_action(action, resource, user_id)
            
            return result
        return decorated_function
    return decorator