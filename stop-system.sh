#!/bin/bash

echo "🛑 Stopping Fleet Management System..."

pkill -f "python3.*app.py"
pkill -f "npm run dev"

sleep 2

echo "✅ System stopped!"
