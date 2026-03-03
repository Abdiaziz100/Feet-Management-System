#!/bin/bash

echo "🚀 Starting Fleet Management System..."

# Start backend
echo "📡 Starting Flask backend on port 5001..."
cd backend
python app.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "⚛️  Starting React frontend on port 5173..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ System started!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:5001"
echo "🔑 Login: admin / password"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait $BACKEND_PID $FRONTEND_PID