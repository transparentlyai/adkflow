#!/bin/bash

# ADKFlow Backend Startup Script
# Starts the FastAPI backend server

set -e

echo "🚀 Starting ADKFlow Backend..."
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ]; then
    echo "❌ Error: backend directory not found"
    echo "Please run this script from the adkflow project root"
    exit 1
fi

cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -q --upgrade pip
pip install -q fastapi "uvicorn[standard]" "pydantic>=2.0" pyyaml python-multipart

# Get port from environment or use default
BACKEND_PORT=${BACKEND_PORT:-8000}

echo ""
echo "✅ Backend ready!"
echo "🌐 Starting server at http://localhost:$BACKEND_PORT"
echo "📚 API docs at http://localhost:$BACKEND_PORT/docs"
echo "🔓 CORS enabled for all origins (development mode)"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Go back to project root and add to PYTHONPATH
cd ..
export PYTHONPATH="${PWD}:${PYTHONPATH}"

# Export port for Python script
export BACKEND_PORT

# Start the server
python -m backend.src.main
