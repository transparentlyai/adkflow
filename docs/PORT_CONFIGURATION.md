# Port Configuration Guide

ADKFlow supports custom port configuration for both backend and frontend servers. This is useful when default ports are already in use or for running multiple instances.

## Quick Start

### Using Default Ports

```bash
./dev.sh
```

This starts:
- Backend on `http://localhost:8000`
- Frontend on `http://localhost:3000`

### Using Custom Ports

```bash
# Custom ports for both services
./dev.sh -b 8080 -f 3001

# Or using long options
./dev.sh --backend-port 8080 --frontend-port 3001

# Custom backend port only (frontend uses default 3000)
./dev.sh -b 9000

# Custom frontend port only (backend uses default 8000)
./dev.sh -f 3001
```

## Command Options

### dev.sh Options

```bash
./dev.sh [OPTIONS]

Options:
  -b, --backend-port PORT     Backend port (default: 8000)
  -f, --frontend-port PORT    Frontend port (default: 3000)
  -h, --help                  Show help message

Examples:
  ./dev.sh                              # Default ports (8000, 3000)
  ./dev.sh -b 8080 -f 3001              # Custom ports
  ./dev.sh --backend-port 9000          # Custom backend only
```

## Manual Startup with Custom Ports

### Backend

```bash
# Set environment variable
export BACKEND_PORT=8080

# Start backend
./start-backend.sh
```

Backend will:
- Start on specified port (8080)
- Allow CORS from any origin (development mode)
- Display URLs on startup

### Frontend

```bash
# Set environment variables
export FRONTEND_PORT=3001
export BACKEND_PORT=8080

# Start frontend
./start-frontend.sh
```

Frontend will:
- Start on specified port (3001)
- Auto-configure API URL to backend port (8080)
- Update `.env.local` automatically

## Environment Variables

### BACKEND_PORT
- **Default**: 8000
- **Used by**: `start-backend.sh`, `backend/src/main.py`
- **Purpose**: Port for FastAPI server

### FRONTEND_PORT
- **Default**: 3000
- **Used by**: `start-frontend.sh`
- **Purpose**: Port for Next.js dev server

## Port Conflicts

If you encounter port conflicts:

```bash
# Check which process is using a port
lsof -ti:8000

# Kill process on port
lsof -ti:8000 | xargs kill

# Or use custom ports
./dev.sh -b 8080 -f 3001
```

## CORS Configuration

The backend is configured for development mode with permissive CORS:

```python
# In backend/src/main.py (development mode)
allow_origins=["*"]  # Allow all origins in development
```

This means:
- Any frontend port is automatically allowed
- No CORS configuration needed during development
- **NOTE**: For production, restrict origins to your specific domain

## Frontend API Configuration

The frontend automatically configures the backend API URL:

```bash
# In start-frontend.sh
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT
EOF
```

This means:
- Backend URL is auto-configured based on BACKEND_PORT
- No manual `.env.local` editing needed
- Works with any port configuration

## Examples

### Example 1: Run on Alternative Ports

```bash
# Ports 8000 and 3000 are in use
./dev.sh -b 8080 -f 3001

# Access at:
# - Frontend: http://localhost:3001
# - Backend: http://localhost:8080
# - API Docs: http://localhost:8080/docs
```

### Example 2: Multiple Instances

```bash
# Instance 1 (default ports)
./dev.sh

# Instance 2 (custom ports) - in a different terminal
./dev.sh -b 8001 -f 3001
```

### Example 3: Separate Startup

```bash
# Terminal 1: Backend on port 9000
export BACKEND_PORT=9000
export FRONTEND_PORT=3001
./start-backend.sh

# Terminal 2: Frontend on port 3001
export FRONTEND_PORT=3001
export BACKEND_PORT=9000
./start-frontend.sh
```

## Troubleshooting

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Option 1: Kill the process
lsof -ti:3000 | xargs kill

# Option 2: Use different port
./dev.sh -f 3001
```

### CORS Errors

**Problem**: `CORS error: No 'Access-Control-Allow-Origin' header`

**Solution**:
- Restart the backend server (CORS allows all origins in development)
- Check backend is actually running: `curl http://localhost:8000/health`

```bash
# Restart servers
./dev.sh -b 8080 -f 3001
```

### Wrong API URL

**Problem**: Frontend can't reach backend

**Solution**:
```bash
# Check .env.local was created correctly
cat frontend/.env.local

# Should show:
# NEXT_PUBLIC_API_URL=http://localhost:8080

# If wrong, restart frontend:
export BACKEND_PORT=8080
./start-frontend.sh
```

## Production Considerations

For production deployments:

1. **Use reverse proxy** (nginx, traefik) instead of port configuration
2. **Set fixed ports** in environment variables
3. **Configure firewall** rules for custom ports
4. **Update CORS origins** for production domain
5. **Use HTTPS** with proper certificates

Example production setup:
```bash
# Production environment variables
export BACKEND_PORT=8000
export FRONTEND_PORT=3000
export CORS_ORIGINS="https://app.example.com,https://www.app.example.com"
```

## Related Files

- `/home/mauro/projects/adkflow/dev.sh` - Main dev script with port options
- `/home/mauro/projects/adkflow/start-backend.sh` - Backend startup
- `/home/mauro/projects/adkflow/start-frontend.sh` - Frontend startup
- `/home/mauro/projects/adkflow/backend/src/main.py` - Backend app with port config

## Summary

- **Default ports**: 8000 (backend), 3000 (frontend)
- **Custom ports**: Use `-b` and `-f` flags with `dev.sh`
- **Auto-configuration**: CORS and API URLs configured automatically
- **Multiple instances**: Run on different ports simultaneously
- **No manual config**: Everything updates automatically

Happy coding! 🚀
