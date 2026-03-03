from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    """Enhanced User model with RBAC and security features"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(100), unique=True)
    role = db.Column(db.String(20), default='user')  # admin, manager, driver, viewer
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    last_login = db.Column(db.DateTime, nullable=True)
    password_changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    mfa_enabled = db.Column(db.Boolean, default=False)
    mfa_secret = db.Column(db.String(32), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'mfa_enabled': self.mfa_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_sensitive:
            data.update({
                'failed_login_attempts': self.failed_login_attempts,
                'locked_until': self.locked_until.isoformat() if self.locked_until else None
            })
        
        return data
    
    def is_locked(self):
        """Check if user account is locked"""
        if self.locked_until and datetime.utcnow() < self.locked_until:
            return True
        return False
    
    def can_access(self, required_role):
        """Check if user has required role access"""
        role_hierarchy = {'viewer': 1, 'driver': 2, 'manager': 3, 'admin': 4}
        user_level = role_hierarchy.get(self.role, 0)
        required_level = role_hierarchy.get(required_role, 0)
        return user_level >= required_level

class UserSession(db.Model):
    """Track user sessions for security"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    session_token = db.Column(db.String(255), unique=True, nullable=False)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    user = db.relationship('User', backref=db.backref('sessions', lazy=True))

class SecurityLog(db.Model):
    """Security event logging"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    event_type = db.Column(db.String(50), nullable=False)  # login, logout, failed_login, etc.
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    details = db.Column(db.Text)  # JSON string with additional details
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('security_logs', lazy=True))

class AuditLog(db.Model):
    """Audit trail for user actions"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False)  # CREATE, UPDATE, DELETE, VIEW
    resource = db.Column(db.String(50), nullable=False)  # vehicle, driver, trip, etc.
    resource_id = db.Column(db.String(50))
    old_values = db.Column(db.Text)  # JSON string
    new_values = db.Column(db.Text)  # JSON string
    ip_address = db.Column(db.String(45))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('audit_logs', lazy=True))

class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    plate = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(20), default='active')
    driver_name = db.Column(db.String(100))  # Assigned driver name
    
    def to_dict(self):
        return {
            'id': self.id,
            'plate': self.plate,
            'status': self.status,
            'driver_name': self.driver_name
        }

class Driver(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    license_number = db.Column(db.String(50))
    active = db.Column(db.Boolean, default=True)
    assigned_vehicle = db.Column(db.String(50))  # Vehicle plate number
    current_location = db.Column(db.String(200))  # Current location
    last_seen = db.Column(db.String(50))  # Last seen timestamp
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'license_number': self.license_number,
            'active': self.active,
            'assigned_vehicle': self.assigned_vehicle,
            'current_location': self.current_location,
            'last_seen': self.last_seen
        }

class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle = db.Column(db.String(50), nullable=False)
    driver = db.Column(db.String(100), nullable=False)
    start_location = db.Column(db.String(200), nullable=False)
    end_location = db.Column(db.String(200), nullable=False)
    distance = db.Column(db.Float, default=0)
    date = db.Column(db.String(50))
    status = db.Column(db.String(20), default='completed')
    
    def to_dict(self):
        return {
            'id': self.id,
            'vehicle': self.vehicle,
            'driver': self.driver,
            'start_location': self.start_location,
            'end_location': self.end_location,
            'distance': self.distance,
            'date': self.date,
            'status': self.status
        }

class Fuel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle = db.Column(db.String(50), nullable=False)
    liters = db.Column(db.Float, default=0)
    cost = db.Column(db.Float, default=0)
    date = db.Column(db.String(50))
    station = db.Column(db.String(100))
    
    def to_dict(self):
        return {
            'id': self.id,
            'vehicle': self.vehicle,
            'liters': self.liters,
            'cost': self.cost,
            'date': self.date,
            'station': self.station
        }

class Maintenance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle = db.Column(db.String(50), nullable=False)
    issue = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    cost = db.Column(db.Float, default=0)
    date = db.Column(db.String(50))
    status = db.Column(db.String(20), default='pending')
    
    def to_dict(self):
        return {
            'id': self.id,
            'vehicle': self.vehicle,
            'issue': self.issue,
            'description': self.description,
            'cost': self.cost,
            'date': self.date,
            'status': self.status
        }

