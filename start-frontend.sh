#!/bin/bash

# ADKFlow Frontend Startup Script
# Starts the Next.js development server

set -e

echo "🚀 Starting ADKFlow Frontend..."
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found"
    echo "Please run this script from the adkflow project root"
    exit 1
fi

cd frontend

# Get ports from environment or use defaults
FRONTEND_PORT=${FRONTEND_PORT:-3000}
BACKEND_PORT=${BACKEND_PORT:-8000}

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✓ Dependencies already installed"
fi

echo ""
echo "✅ Frontend ready!"
echo "🌐 Starting development server at http://localhost:$FRONTEND_PORT"
echo "🔗 Backend API at http://localhost:$BACKEND_PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Update .env.local with backend URL
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT
EOF

# Start the development server with custom port
npm run dev -- -p $FRONTEND_PORT
