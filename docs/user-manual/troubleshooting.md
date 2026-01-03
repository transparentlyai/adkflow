# Troubleshooting

Common issues and solutions.

## Installation Issues

### "Command not found: adkflow"

**Cause**: Not running from repository root.

**Solution**:
```bash
cd /path/to/adkflow
./adkflow dev
```

### "uv: command not found"

**Cause**: uv package manager not installed.

**Solution**:
```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with pip
pip install uv
```

### "npm: command not found"

**Cause**: Node.js not installed.

**Solution**: Install Node.js 18+ from [nodejs.org](https://nodejs.org/).

### Setup fails with dependency errors

**Solution**:
```bash
# Clean install
rm -rf frontend/node_modules backend/.venv
./adkflow setup
```

## Startup Issues

### Port already in use

**Cause**: Previous server still running.

**Solution**:
```bash
./adkflow stop
./adkflow dev
```

Or manually:
```bash
# Kill frontend (port 3000)
lsof -ti:3000 | xargs kill -9

# Kill backend (port 8000)
lsof -ti:8000 | xargs kill -9
```

### Backend fails to start

**Check logs**:
```bash
cd backend
python -m backend.src.main
```

Common causes:
- Missing Python packages
- Invalid environment variables
- Port conflict

### Frontend fails to start

**Check logs**:
```bash
cd frontend
npm run dev
```

Common causes:
- Missing node_modules
- Port conflict
- TypeScript errors

## API Issues

### "API key not found" or "Invalid API key"

**Cause**: Google API key not configured.

**Solution**:
```bash
export GOOGLE_API_KEY="your-api-key"
```

Get your key at [Google AI Studio](https://aistudio.google.com/).

### "Quota exceeded"

**Cause**: API rate limit reached.

**Solutions**:
- Wait and retry
- Use a different API key
- Upgrade to a paid tier

### "Model not found"

**Cause**: Invalid model name.

**Solution**: Check available models:
- `gemini-2.0-flash-exp`
- `gemini-1.5-pro`
- `gemini-1.5-flash`

## Workflow Issues

### Validation errors

**"Required input not connected"**
- Find the node with the error
- Connect the required input

**"Invalid configuration"**
- Open the node
- Check for empty required fields

### Execution hangs

**Causes**:
- Waiting for API response
- Infinite loop
- Network issue

**Solutions**:
- Click Cancel
- Check network connection
- Add timeout configuration

### No output appears

**Check**:
- Run Panel is visible
- Workflow actually started (node states)
- No silent errors

### Type mismatch errors

**Cause**: Connected types aren't compatible.

**Solution**:
- Check accepted types on input
- Use appropriate source node
- Add conversion logic

## UI Issues

### Canvas is blank

**Solutions**:
1. Refresh the page
2. Clear browser cache
3. Check browser console for errors

### Nodes won't move

**Cause**: Canvas is locked.

**Solution**: Click the lock icon in zoom controls to unlock.

### Can't connect nodes

**Causes**:
- Types incompatible
- Already connected (for single-connection inputs)
- Dragging wrong direction

### Theme not applying

**Solutions**:
1. Hard refresh (Ctrl+Shift+R)
2. Clear local storage
3. Try a different browser

### Slow performance

**Causes**:
- Very large workflow (100+ nodes)
- Browser memory issues

**Solutions**:
- Collapse nodes
- Split into multiple tabs
- Refresh the page
- Use a different browser

## Project Issues

### Can't open project

**Causes**:
- Invalid project path
- Corrupted manifest.json
- Missing permissions

**Solutions**:
1. Check path exists
2. Verify manifest.json is valid JSON
3. Check file permissions

### Changes not saving

**Causes**:
- Disk full
- Permission denied
- File locked

**Check**:
- Disk space
- File permissions
- Other programs using the files

### Lost work

**Prevention**:
- ADKFlow auto-saves frequently
- Use version control (git)

**Recovery**:
- Check for backup files
- Look in browser local storage

## Browser Issues

### Recommended Browsers

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

### Known Issues

| Browser | Issue | Workaround |
|---------|-------|------------|
| Safari | Occasional scroll issues | Use Chrome |
| Firefox | Minor styling differences | Generally works |

## Debugging Tools (Dev Mode)

When running with `./adkflow dev`, powerful debugging tools are available:

### Debug Panel

1. Run a workflow to open the Run Panel
2. Click the **⚙** (gear) icon
3. Configure logging levels and options

### Log Explorer

1. Click the **📄** icon in the Run Panel header
2. Opens in a new tab at `/debug?tab=logs`
3. View structured logs with filtering and search

### Trace Explorer

1. Click the **📊** icon in the Run Panel header
2. Opens in a new tab at `/debug?tab=traces`
3. Visualize agent execution as a span tree
4. See timing, model names, and tool names

### Clear Before Run

Enable "Clear logs before run" or "Clear traces before run" in the Debug Panel to start each run with clean files.

## Getting Help

### Check Logs

**Using Log Explorer (recommended)**:
1. Run with `./adkflow dev`
2. Click the **📄** icon in the Run Panel
3. Filter and search logs in the UI

**Backend logs**:
```bash
# Check terminal running backend
# Or run manually to see output
cd backend && python -m backend.src.main
```

**Frontend logs**:
- Open browser Developer Tools (F12)
- Check Console tab

**API logs**:
- Backend terminal shows API calls
- Check http://localhost:8000/docs for API explorer
- Use Log Explorer with "api" category filter

### Report Issues

If you can't resolve an issue:
1. Check [GitHub Issues](https://github.com/transparentlyai/adkflow/issues)
2. Create a new issue with:
   - Steps to reproduce
   - Error messages
   - Browser/OS version
   - Screenshots if helpful

## See Also

- [Getting Started](./getting-started.md) - Installation
- [Running Workflows](./running-workflows.md) - Execution issues
- [Validation](./validation.md) - Validation errors
