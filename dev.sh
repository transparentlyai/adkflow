#!/bin/bash

# ADKFlow Development Script
# Starts both backend and frontend in parallel

set -e

# Default ports
BACKEND_PORT=8000
FRONTEND_PORT=3000

# Parse command line arguments
show_help() {
    cat << EOF
Usage: ./dev.sh [OPTIONS]

Start ADKFlow development environment with backend and frontend servers.

Options:
    -b, --backend-port PORT     Backend port (default: 8000)
    -f, --frontend-port PORT    Frontend port (default: 3000)
    -h, --help                  Show this help message

Examples:
    ./dev.sh                              # Use default ports (8000, 3000)
    ./dev.sh -b 8080 -f 3001              # Custom ports
    ./dev.sh --backend-port 9000          # Custom backend port only
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--backend-port)
            BACKEND_PORT="$2"
            shift 2
            ;;
        -f|--frontend-port)
            FRONTEND_PORT="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "❌ Unknown option: $1"
            echo "Run './dev.sh --help' for usage information"
            exit 1
            ;;
    esac
done

# Project directory
PROJECT_DIR="/home/mauro/projects/adkflow"

echo "🚀 Starting ADKFlow Development Environment..."
echo "   Backend port: $BACKEND_PORT"
echo "   Frontend port: $FRONTEND_PORT"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down development servers..."

    # Kill backend
    if [ ! -z "$BACKEND_PID" ]; then
        pkill -P $BACKEND_PID 2>/dev/null || true
        kill $BACKEND_PID 2>/dev/null || true
    fi

    # Kill frontend
    if [ ! -z "$FRONTEND_PID" ]; then
        pkill -P $FRONTEND_PID 2>/dev/null || true
        kill $FRONTEND_PID 2>/dev/null || true
    fi

    # Additional cleanup for any remaining processes
    pkill -f "python -m backend.src.main" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true

    echo "✅ Servers stopped"
    exit 0
}

# Set up trap to catch Ctrl+C and cleanup
trap cleanup INT TERM

# Start backend
echo "📦 Starting backend server..."
cd "$PROJECT_DIR"
BACKEND_PORT=$BACKEND_PORT ./start-backend.sh > /tmp/adkflow-backend.log 2>&1 &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check logs at /tmp/adkflow-backend.log"
    cat /tmp/adkflow-backend.log
    exit 1
fi

# Start frontend
echo "🎨 Starting frontend server..."
cd "$PROJECT_DIR"
NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT" FRONTEND_PORT=$FRONTEND_PORT ./start-frontend.sh > /tmp/adkflow-frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a bit for frontend to start
sleep 3

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend failed to start. Check logs at /tmp/adkflow-frontend.log"
    cat /tmp/adkflow-frontend.log
    cleanup
    exit 1
fi

echo ""
echo "✅ Development environment started!"
echo ""
echo "📺 Servers running:"
echo "   - Backend:  http://localhost:$BACKEND_PORT (PID: $BACKEND_PID)"
echo "   - Frontend: http://localhost:$FRONTEND_PORT (PID: $FRONTEND_PID)"
echo ""
echo "📝 Logs:"
echo "   - Backend:  tail -f /tmp/adkflow-backend.log"
echo "   - Frontend: tail -f /tmp/adkflow-frontend.log"
echo ""
echo "💡 Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait
