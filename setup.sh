#!/bin/bash

echo "🚀 FLEET MANAGEMENT SYSTEM - FINAL SETUP"
echo "========================================"

# Backend setup
echo "📡 Setting up backend..."
cd backend
pip install -r requirements.txt
echo "✅ Backend dependencies installed"

# Frontend setup  
echo "⚛️  Setting up frontend..."
cd ../frontend
npm install
echo "✅ Frontend dependencies installed"

echo ""
echo "🎉 SETUP COMPLETE!"
echo ""
echo "📋 TO RUN THE SYSTEM:"
echo "1. Backend: cd backend && python app.py"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 ACCESS:"
echo "• Frontend: http://localhost:5173"
echo "• Backend API: http://localhost:5001"
echo "• Login: admin / password"
echo ""
echo "✨ FEATURES INCLUDED:"
echo "• Dashboard with live statistics"
echo "• Vehicle management with driver assignments"
echo "• Driver management"
echo "• Trip tracking with locations"
echo "• Fuel management"
echo "• Maintenance tracking"
echo "• Driver-Vehicle assignments"
echo "• Comprehensive reports"
echo "• Responsive design"
echo ""
echo "🎯 PROJECT IS 100% COMPLETE!"