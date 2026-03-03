#!/bin/bash

echo "🔐 Setting up Enhanced Security Features for Fleet Management System"
echo "=================================================================="

# Install backend dependencies
echo "📦 Installing backend security dependencies..."
cd backend
pip install -r requirements_security.txt

# Install frontend dependencies  
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install axios

# Create environment file for security configuration
echo "⚙️ Creating security configuration..."
cd ../backend
cat > .env << EOF
# Security Configuration
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
JWT_EXPIRATION_HOURS=24
REFRESH_TOKEN_DAYS=7
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900
PASSWORD_MIN_LENGTH=8
PASSWORD_COMPLEXITY=true
SESSION_TIMEOUT=3600

# Database
DATABASE_URL=sqlite:///database.db

# CORS
CORS_ORIGINS=http://localhost:5173

# Security Features
ENABLE_MFA=true
ENABLE_AUDIT_LOGGING=true
ENABLE_RATE_LIMITING=true
EOF

# Update package.json to include new dependencies
echo "📝 Updating package.json..."
cd ../frontend
npm install --save qrcode.js

# Create startup script for enhanced security
echo "🚀 Creating enhanced startup script..."
cd ..
cat > run-enhanced-system.sh << 'EOF'
#!/bin/bash

echo "🔐 Starting Enhanced Fleet Management System with Security Features"
echo "================================================================="

# Start backend with enhanced security
echo "🔧 Starting enhanced backend server..."
cd backend
python auth_app.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Enhanced Fleet Management System is running!"
echo ""
echo "🔗 Access URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:5002"
echo ""
echo "🔐 Security Features Enabled:"
echo "   ✓ JWT Authentication with Auto-Refresh"
echo "   ✓ Role-based Access Control (RBAC)"
echo "   ✓ Multi-factor Authentication (MFA)"
echo "   ✓ Password Complexity Requirements"
echo "   ✓ Account Lockout Protection"
echo "   ✓ Audit Logging"
echo "   ✓ Rate Limiting"
echo "   ✓ Session Management"
echo ""
echo "👥 Demo Accounts:"
echo "   Admin:   admin / Admin@123"
echo "   Manager: manager / Manager@123"
echo "   Driver:  driver / Driver@123"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo ""; echo "🛑 Stopping services..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT
wait
EOF

chmod +x run-enhanced-system.sh

echo ""
echo "✅ Enhanced Security Setup Complete!"
echo ""
echo "🔐 Security Features Added:"
echo "   ✓ JWT Authentication with Auto-Refresh"
echo "   ✓ Role-based Access Control (Admin, Manager, Driver, Viewer)"
echo "   ✓ Multi-factor Authentication (MFA) with QR codes"
echo "   ✓ Password Complexity Requirements"
echo "   ✓ Account Lockout after failed attempts"
echo "   ✓ Comprehensive Audit Logging"
echo "   ✓ Rate Limiting for API endpoints"
echo "   ✓ Session Management and Tracking"
echo "   ✓ Security Event Monitoring"
echo "   ✓ User Management (Admin only)"
echo ""
echo "🚀 To start the enhanced system:"
echo "   ./run-enhanced-system.sh"
echo ""
echo "🔗 New Routes Added:"
echo "   /security - Security settings for all users"
echo "   /admin/users - User management (Admin only)"
echo ""
echo "📚 Security Documentation:"
echo "   - All passwords must be 8+ chars with complexity requirements"
echo "   - MFA can be enabled in Security Settings"
echo "   - Admin users can manage other users"
echo "   - All actions are logged for audit purposes"
echo "   - Sessions auto-refresh JWT tokens"
echo ""