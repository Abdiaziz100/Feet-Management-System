#!/bin/bash

echo "🧪 Testing Fleet Management System..."

# Test if backend is running
echo "📡 Testing backend connection..."
curl -s http://localhost:5001/ || echo "❌ Backend not running on port 5001"

# Test login endpoint
echo "🔐 Testing login..."
curl -s -X POST http://localhost:5001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' || echo "❌ Login test failed"

# Test adding a vehicle
echo "🚗 Testing add vehicle..."
curl -s -X POST http://localhost:5001/vehicles \
  -H "Content-Type: application/json" \
  -d '{"plate":"KCA-123A","status":"active"}' || echo "❌ Add vehicle test failed"

# Test getting vehicles
echo "📋 Testing get vehicles..."
curl -s http://localhost:5001/vehicles || echo "❌ Get vehicles test failed"

echo "✅ Tests completed!"