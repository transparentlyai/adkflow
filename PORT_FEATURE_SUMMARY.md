# Port Configuration Feature - Implementation Summary

## Overview

Added command-line options to `dev.sh` for specifying custom backend and frontend ports, plus automatic port configuration across all components.

## What Was Added

### 1. CLI Options for dev.sh

```bash
./dev.sh [OPTIONS]

Options:
  -b, --backend-port PORT     Backend port (default: 8000)
  -f, --frontend-port PORT    Frontend port (default: 3000)
  -h, --help                  Show help message
```

### 2. Automatic Port Configuration

All components now automatically configure themselves based on environment variables:

- **Backend**: Reads `BACKEND_PORT` and `FRONTEND_PORT` for server and CORS
- **Frontend**: Reads `FRONTEND_PORT` and `BACKEND_PORT` for server and API URL
- **CORS**: Automatically allows the specified frontend port
- **API URL**: Automatically points to the specified backend port

## Files Modified

### 1. `/home/mauro/projects/adkflow/dev.sh`
**Changes:**
- Added argument parsing for `-b`, `-f`, `-h` options
- Added help message
- Pass ports to start scripts via environment variables
- Display configured ports on startup

### 2. `/home/mauro/projects/adkflow/backend/src/main.py`
**Changes:**
- Read `BACKEND_PORT` from environment (default: 8000)
- Read `FRONTEND_PORT` for CORS configuration
- Configure CORS for both custom and default frontend ports
- Use custom port for uvicorn

### 3. `/home/mauro/projects/adkflow/start-backend.sh`
**Changes:**
- Read `BACKEND_PORT` from environment (default: 8000)
- Read `FRONTEND_PORT` from environment (default: 3000)
- Display configured ports on startup
- Export ports for Python application

### 4. `/home/mauro/projects/adkflow/start-frontend.sh`
**Changes:**
- Read `FRONTEND_PORT` from environment (default: 3000)
- Read `BACKEND_PORT` from environment (default: 8000)
- Auto-generate `.env.local` with correct backend URL
- Start Next.js with custom port (`-p` flag)
- Display configured ports on startup

### 5. `/home/mauro/projects/adkflow/README.md`
**Changes:**
- Added "Alternative: Automated Startup" section
- Documented port options
- Referenced PORT_CONFIGURATION.md

## New Documentation Files

### 1. `PORT_CONFIGURATION.md`
Comprehensive guide covering:
- Quick start examples
- Command options
- Manual startup with custom ports
- Environment variables
- CORS configuration
- Frontend API configuration
- Port conflict resolution
- Multiple instance examples
- Troubleshooting
- Production considerations

### 2. `PORT_FEATURE_SUMMARY.md`
This file - implementation summary

## Usage Examples

### Example 1: Default Ports
```bash
./dev.sh
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

### Example 2: Custom Ports
```bash
./dev.sh -b 8080 -f 3001
# Backend: http://localhost:8080
# Frontend: http://localhost:3001
```

### Example 3: Custom Backend Only
```bash
./dev.sh -b 9000
# Backend: http://localhost:9000
# Frontend: http://localhost:3000 (default)
```

### Example 4: Help
```bash
./dev.sh --help
# Shows usage information
```

### Example 5: Manual Startup
```bash
# Terminal 1
export BACKEND_PORT=8080
export FRONTEND_PORT=3001
./start-backend.sh

# Terminal 2
export FRONTEND_PORT=3001
export BACKEND_PORT=8080
./start-frontend.sh
```

## Technical Details

### Port Resolution Flow

1. **dev.sh** → Parses CLI arguments → Sets environment variables
2. **start-backend.sh** → Reads env vars → Exports to Python → Starts uvicorn
3. **start-frontend.sh** → Reads env vars → Updates .env.local → Starts Next.js
4. **Backend app** → Reads env vars → Configures CORS and server port
5. **Frontend app** → Reads .env.local → Configures API URL

### CORS Configuration

Backend automatically allows:
```python
allow_origins=[
    f"http://localhost:{frontend_port}",  # Custom port
    "http://localhost:3000",               # Always allow default
]
```

### Frontend API Configuration

Automatically generated `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:{backend_port}
```

## Benefits

1. **Flexibility**: Run on any available ports
2. **Multiple Instances**: Run several ADKFlow instances simultaneously
3. **Port Conflict Resolution**: Easy workaround for port conflicts
4. **Automatic Configuration**: No manual editing of config files
5. **Developer Friendly**: Simple CLI interface
6. **Production Ready**: Can be configured via environment variables

## Backward Compatibility

✅ **100% Backward Compatible**

- Default behavior unchanged (ports 8000 and 3000)
- All existing scripts work without modification
- No breaking changes to any component
- Optional feature - use if needed

## Testing

### Test 1: Default Ports
```bash
./dev.sh --help
# ✅ Shows help message

./dev.sh
# ✅ Starts on ports 8000 and 3000
```

### Test 2: Custom Ports
```bash
./dev.sh -b 8080 -f 3001
# ✅ Backend: localhost:8080
# ✅ Frontend: localhost:3001
# ✅ CORS configured correctly
# ✅ API URL configured correctly
```

### Test 3: Manual Startup
```bash
BACKEND_PORT=9000 ./start-backend.sh
# ✅ Starts on port 9000
# ✅ Shows correct port in output
```

## Future Enhancements

Potential additions:
- Environment file support (`.ports` file)
- Port availability checking
- Auto-increment on conflict
- Docker compose port mapping
- Systemd service with custom ports

## Related Issues

This feature solves:
- Port conflicts with other services
- Running multiple development instances
- Testing on different ports
- Production deployment flexibility

## Status

✅ **COMPLETE AND TESTED**

All components working correctly with custom ports:
- CLI argument parsing
- Environment variable propagation
- Automatic CORS configuration
- Automatic API URL configuration
- Help documentation
- User documentation

## Summary

Added comprehensive port configuration support to ADKFlow with:
- Simple CLI interface (`-b`, `-f` options)
- Automatic configuration across all components
- Comprehensive documentation
- 100% backward compatible
- Production-ready

Users can now easily run ADKFlow on any available ports without manual configuration!
