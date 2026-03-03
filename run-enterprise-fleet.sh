#!/bin/bash

echo "🚛 Starting Enterprise Fleet Management System"
echo "============================================="

# Start backend
echo "🔧 Starting enterprise backend server..."
python enterprise_fleet_system.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Enterprise Fleet Management System is running!"
echo ""
echo "🔗 Access URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:5000"
echo ""
echo "👥 Demo Accounts:"
echo "   Admin:   admin / admin123"
echo "   Manager: manager / manager123"
echo "   Driver:  driver1 / driver123"
echo ""
echo "🚀 ENTERPRISE FEATURES INCLUDED:"
echo ""
echo "📊 ANALYTICS & REPORTING:"
echo "   • Real-time KPI Dashboard"
echo "   • Predictive Maintenance Alerts"
echo "   • Fuel Efficiency Analysis"
echo "   • Cost per Kilometer Tracking"
echo "   • Performance Benchmarking"
echo "   • Custom Report Generation"
echo "   • Multi-format Export (CSV, PDF)"
echo ""
echo "🗺️ TRACKING & MONITORING:"
echo "   • Live GPS Vehicle Tracking"
echo "   • Real-time Location Updates"
echo "   • Route Optimization"
echo "   • Geofencing Capabilities"
echo "   • Driver Behavior Monitoring"
echo ""
echo "🔐 SECURITY & ACCESS:"
echo "   • JWT Token Authentication"
echo "   • Role-based Access Control"
echo "   • Multi-user Support"
echo "   • Secure API Endpoints"
echo "   • Session Management"
echo ""
echo "🚗 FLEET MANAGEMENT:"
echo "   • Comprehensive Vehicle Profiles"
echo "   • Driver Management & Scoring"
echo "   • Trip Planning & Tracking"
echo "   • Fuel Management & Optimization"
echo "   • Maintenance Scheduling"
echo "   • Alert & Notification System"
echo ""
echo "📱 USER EXPERIENCE:"
echo "   • Modern Responsive Design"
echo "   • Intuitive Dashboard Interface"
echo "   • Real-time Data Updates"
echo "   • Mobile-friendly Layout"
echo "   • Professional UI/UX"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo ""; echo "🛑 Stopping services..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT
wait
