#!/bin/bash

echo "📊 Setting up Advanced Analytics & Reporting Features"
echo "===================================================="

# Install backend dependencies
echo "📦 Installing analytics dependencies..."
cd backend
pip install -r requirements_analytics.txt

# Create analytics startup script
echo "🚀 Creating analytics startup script..."
cd ..
cat > run-analytics-system.sh << 'EOF'
#!/bin/bash

echo "📊 Starting Fleet Management System with Advanced Analytics"
echo "=========================================================="

# Start backend with analytics
echo "🔧 Starting analytics-enabled backend server..."
cd backend
python app_with_analytics.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Fleet Management System with Analytics is running!"
echo ""
echo "🔗 Access URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:5002"
echo ""
echo "📊 New Analytics Features:"
echo "   ✓ Advanced Dashboard with Real-time KPIs"
echo "   ✓ Interactive Charts and Visualizations"
echo "   ✓ Vehicle & Driver Performance Analytics"
echo "   ✓ Predictive Insights & Maintenance Alerts"
echo "   ✓ Custom Report Builder"
echo "   ✓ Export Reports (PDF, CSV, Excel)"
echo "   ✓ Time Series Analysis"
echo "   ✓ Cost Analysis & Optimization"
echo ""
echo "🎯 New Routes:"
echo "   /analytics - Advanced Analytics Dashboard"
echo "   /report-builder - Custom Report Builder"
echo ""
echo "📈 API Endpoints:"
echo "   /analytics/kpis - Key Performance Indicators"
echo "   /analytics/time-series - Chart data"
echo "   /analytics/vehicle-performance - Vehicle metrics"
echo "   /analytics/driver-performance - Driver metrics"
echo "   /analytics/insights - Predictive insights"
echo "   /reports/export/{type}?format={csv|pdf} - Export reports"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo ""; echo "🛑 Stopping services..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT
wait
EOF

chmod +x run-analytics-system.sh

echo ""
echo "✅ Advanced Analytics Setup Complete!"
echo ""
echo "📊 Analytics Features Added:"
echo "   ✓ Real-time KPI Dashboard with 8+ key metrics"
echo "   ✓ Interactive time-series charts for trends"
echo "   ✓ Vehicle performance analytics & rankings"
echo "   ✓ Driver performance monitoring & insights"
echo "   ✓ Predictive maintenance alerts"
echo "   ✓ Fuel cost trend analysis"
echo "   ✓ Custom report builder with filters"
echo "   ✓ Multi-format export (PDF, CSV, Excel)"
echo "   ✓ Cost per kilometer analysis"
echo "   ✓ Fleet utilization optimization"
echo ""
echo "🚀 To start the analytics-enabled system:"
echo "   ./run-analytics-system.sh"
echo ""
echo "📈 Key Performance Indicators:"
echo "   • Fleet Size & Active Vehicles"
echo "   • Vehicle Utilization Rate"
echo "   • Total Distance & Fuel Efficiency"
echo "   • Cost per Kilometer"
echo "   • Pending Maintenance Items"
echo "   • Total Operational Costs"
echo ""
echo "🔮 Predictive Analytics:"
echo "   • Maintenance due predictions"
echo "   • Fuel cost trend analysis"
echo "   • Driver efficiency alerts"
echo "   • Performance optimization suggestions"
echo ""