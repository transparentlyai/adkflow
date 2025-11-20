# Testing Guide for ADKFlow

Complete testing guide for verifying all components of ADKFlow work correctly.

## Overview

ADKFlow has three main components to test:
1. **Backend** - FastAPI server (YAML conversion, validation)
2. **Frontend** - Next.js UI (Drawflow editor, export/import)
3. **Flow Runner** - CLI tool (ADK execution)

## Prerequisites

Before testing:
```bash
# Ensure all components are set up
./setup-runner.sh

# Set API key for runner tests
export GOOGLE_API_KEY="your-api-key-here"
```

## Backend Tests

### 1. Start the Backend

```bash
./start-backend.sh
```

Wait for: `Uvicorn running on http://localhost:8000`

### 2. Test Health Check

```bash
curl http://localhost:8000/health
```

**Expected output**:
```json
{"status":"healthy"}
```

### 3. Test API Documentation

Visit http://localhost:8000/docs

**Verify**:
- Swagger UI loads
- See 4 endpoints: `/health`, `/api/workflows/validate`, `/api/workflows/export`, `/api/workflows/import`
- `/api/tools`

### 4. Test Workflow Validation

```bash
curl -X POST http://localhost:8000/api/workflows/validate \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "name": "test",
  "version": "1.0",
  "prompts": {
    "test": {
      "content": "Hello",
      "variables": []
    }
  },
  "agents": [{
    "id": "agent1",
    "type": "sequential",
    "model": "gemini-2.0-flash-exp",
    "tools": [],
    "subagents": [{
      "id": "sub1",
      "prompt_ref": "test",
      "tools": []
    }]
  }],
  "connections": []
}
EOF
```

**Expected output**:
```json
{"valid":true,"message":"Workflow is valid"}
```

### 5. Test YAML Export

```bash
curl -X POST http://localhost:8000/api/workflows/export \
  -H "Content-Type: application/json" \
  -d @examples/simple-workflow.yaml
```

**Verify**: Returns YAML formatted text

### 6. Test Tools Endpoint

```bash
curl http://localhost:8000/api/tools
```

**Expected**: JSON array with tools like `code_execution`, `google_search`, etc.

## Frontend Tests

### 1. Start the Frontend

```bash
./start-frontend.sh
```

Wait for: `Ready on http://localhost:3000`

### 2. Test Page Load

Visit http://localhost:3000

**Verify**:
- Page loads without errors
- Title shows "ADKFlow Workflow Editor"
- Toolbar visible on left
- Canvas area visible in center
- No console errors (press F12)

### 3. Test Node Creation

**Add Agent Node**:
1. Click "Add Agent" button
2. **Verify**: Blue agent node appears on canvas

**Add Subagent Node**:
1. Click "Add Subagent" button
2. **Verify**: Purple subagent node appears on canvas

**Add Prompt Node**:
1. Click "Add Prompt" button
2. **Verify**: Green prompt node appears on canvas

### 4. Test Node Positioning

1. Drag any node to a new position
2. **Verify**: Node moves smoothly
3. **Verify**: Connections update (if any)

### 5. Test Prompt Editor

1. Click "Edit Prompt" button on a prompt node
2. **Verify**: Modal opens with markdown editor
3. Type: `# Test Prompt\n\nHello {name}!`
4. **Verify**:
   - Markdown preview shows on right
   - Variable "name" appears in "Detected Variables" section
5. Click "Save"
6. **Verify**: Modal closes, node updates

### 6. Test Node Connections

1. Create: 1 prompt node, 1 subagent node, 1 agent node
2. Drag from prompt output (green dot) to subagent input (blue dot)
3. **Verify**: Connection line appears
4. Drag from subagent output to agent input
5. **Verify**: Second connection appears
6. Click a connection line
7. Press Delete key
8. **Verify**: Connection removed

### 7. Test Export

1. Create a simple workflow (1 agent, 1 subagent, 1 prompt, connections)
2. Click "Export to YAML"
3. **Verify**:
   - File downloads
   - Filename format: `workflow-YYYY-MM-DD.yaml`
   - Open file, verify valid YAML

### 8. Test Import

1. Click "Import from YAML"
2. Select `examples/simple-workflow.yaml`
3. **Verify**:
   - Nodes appear on canvas
   - Connections restored
   - Workflow name updates

### 9. Test Clear Canvas

1. Create several nodes
2. Click "Clear Canvas"
3. Click "OK" on confirmation
4. **Verify**: All nodes removed

### 10. Test Zoom Controls

1. Click "+" button (zoom in)
2. **Verify**: Canvas zooms in
3. Click "-" button (zoom out)
4. **Verify**: Canvas zooms out
5. Click "100%" button
6. **Verify**: Canvas resets to default zoom

## Flow Runner Tests

### 1. Test Installation

```bash
adkflow --help
```

**Expected output**: Help text with commands (run, validate, list-tools)

### 2. Test List Tools

```bash
adkflow list-tools
```

**Expected output**: Table with tool names and descriptions

### 3. Test Validation

```bash
adkflow validate examples/simple-workflow.yaml
```

**Expected output**:
```
✓ Workflow validation successful
✓ Found 1 agent(s)
✓ Found 1 prompt(s)
✓ All prompt references are valid
```

### 4. Test Invalid Workflow

Create invalid workflow:
```bash
cat > /tmp/invalid.yaml << 'EOF'
workflow:
  name: "invalid"
  # Missing required fields
EOF

adkflow validate /tmp/invalid.yaml
```

**Expected**: Error message about missing fields

### 5. Test Simple Execution

**Note**: Requires valid `GOOGLE_API_KEY`

```bash
adkflow run examples/simple-workflow.yaml \
  --var question="What is 2+2?" \
  --verbose
```

**Expected output**:
- "Executing workflow: simple-data-analysis"
- "Executing agent: analyzer (sequential)"
- "Executing subagent: main"
- Agent response (should answer "4")
- "Workflow execution completed"

### 6. Test Complex Execution

```bash
adkflow run examples/sample-workflow.yaml \
  --var repository_path="./frontend" \
  --var language="typescript" \
  --verbose
```

**Expected output**:
- Multiple subagent executions
- Progress bars for each step
- Final report output

### 7. Test Variable Substitution

```bash
adkflow run examples/simple-workflow.yaml \
  --var question="Hello {name}!" \
  --var name="World"
```

**Verify**: Variables are substituted correctly in output

### 8. Test Missing API Key

```bash
unset GOOGLE_API_KEY
adkflow run examples/simple-workflow.yaml
```

**Expected**: Error message: "GOOGLE_API_KEY not found"

### 9. Test Missing Variables

```bash
export GOOGLE_API_KEY="your-key"
adkflow run examples/simple-workflow.yaml
# Don't provide --var question
```

**Expected**: Should use default value or prompt for missing variable

## Integration Tests

### End-to-End Test 1: Create, Export, Run

1. **Frontend**: Create a new workflow
   - Add 1 prompt node with content: "Explain {topic} in one sentence"
   - Add 1 subagent node
   - Add 1 agent node (sequential, gemini-2.0-flash-exp)
   - Connect: prompt → subagent → agent
   - Export as `test-workflow.yaml`

2. **Backend**: Verify export
   ```bash
   cat ~/Downloads/test-workflow.yaml
   ```
   **Verify**: Valid YAML structure

3. **Runner**: Execute workflow
   ```bash
   adkflow run ~/Downloads/test-workflow.yaml \
     --var topic="quantum computing" \
     --verbose
   ```
   **Verify**: Agent executes and returns explanation

### End-to-End Test 2: Import, Modify, Export, Run

1. **Frontend**: Import existing workflow
   - Import `examples/simple-workflow.yaml`

2. **Frontend**: Modify workflow
   - Edit the prompt to ask a different question
   - Export as `modified-workflow.yaml`

3. **Runner**: Run modified workflow
   ```bash
   adkflow run ~/Downloads/modified-workflow.yaml --verbose
   ```
   **Verify**: Uses modified prompt

### End-to-End Test 3: Backend API Integration

1. **Backend**: Export via API
   ```bash
   # Create workflow in frontend
   # Export to YAML
   # Verify backend processed correctly
   ```

2. **Backend**: Import via API
   ```bash
   # Upload YAML via frontend import
   # Verify workflow renders correctly
   ```

## Performance Tests

### Frontend Performance

1. **Many Nodes Test**:
   - Create 20+ nodes
   - Verify smooth dragging and zooming
   - Check memory usage (F12 → Performance)

2. **Large Workflow Import**:
   - Import workflow with 10+ agents
   - Verify loads within 2 seconds

### Backend Performance

```bash
# Concurrent requests test
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/workflows/validate \
    -H "Content-Type: application/json" \
    -d @examples/simple-workflow.yaml &
done
wait
```

**Verify**: All requests complete successfully

### Runner Performance

```bash
# Time workflow execution
time adkflow run examples/simple-workflow.yaml \
  --var question="test"
```

**Verify**: Completes in reasonable time (< 30s for simple workflow)

## Error Handling Tests

### Frontend Error Handling

1. **Network error**: Stop backend, try exporting
   - **Expected**: Error message displayed

2. **Invalid YAML import**: Upload invalid YAML
   - **Expected**: User-friendly error message

3. **Missing connections**: Export workflow with unconnected nodes
   - **Expected**: Warning or validation error

### Backend Error Handling

```bash
# Invalid JSON
curl -X POST http://localhost:8000/api/workflows/validate \
  -H "Content-Type: application/json" \
  -d '{"invalid"'
```

**Expected**: 422 or 400 status with error message

### Runner Error Handling

```bash
# Non-existent file
adkflow run nonexistent.yaml
```

**Expected**: Clear error message about file not found

## Regression Tests

After making changes, run these quick checks:

```bash
# 1. Backend health
curl http://localhost:8000/health

# 2. Frontend loads
curl http://localhost:3000 | grep "ADKFlow"

# 3. Runner works
adkflow list-tools | grep "code_execution"

# 4. Validation works
adkflow validate examples/simple-workflow.yaml
```

## Test Checklist

Use this checklist for complete testing:

- [ ] Backend starts without errors
- [ ] Backend health check passes
- [ ] Backend API docs accessible
- [ ] Backend workflow validation works
- [ ] Backend YAML export works
- [ ] Backend YAML import works
- [ ] Frontend loads without errors
- [ ] Frontend can create all node types
- [ ] Frontend node connections work
- [ ] Frontend prompt editor opens and saves
- [ ] Frontend export downloads YAML
- [ ] Frontend import loads YAML
- [ ] Frontend zoom controls work
- [ ] Frontend clear canvas works
- [ ] Runner CLI installs correctly
- [ ] Runner lists tools
- [ ] Runner validates workflows
- [ ] Runner executes simple workflows
- [ ] Runner handles missing API key gracefully
- [ ] Runner verbose mode shows details
- [ ] End-to-end workflow creation and execution works
- [ ] Error messages are clear and helpful

## Reporting Issues

If tests fail:

1. **Note the exact command** that failed
2. **Copy the error message** (full output)
3. **Check logs**:
   - Backend: Terminal running `start-backend.sh`
   - Frontend: Terminal running `start-frontend.sh` + Browser console (F12)
   - Runner: Add `--verbose` flag
4. **Environment details**:
   - OS version: `uname -a`
   - Python version: `python --version`
   - Node version: `node --version`
   - Package versions: Check `package.json` and `pyproject.toml`

## Success Criteria

All tests pass when:

- ✅ All API endpoints return expected responses
- ✅ Frontend UI is responsive and functional
- ✅ Workflows can be created, exported, imported
- ✅ Runner executes workflows successfully with ADK
- ✅ Error messages are clear and helpful
- ✅ End-to-end workflow works from UI to execution
- ✅ No console errors or warnings
- ✅ Performance is acceptable (workflows execute in < 30s)

## Next Steps

After successful testing:

1. **Create more complex workflows** to test edge cases
2. **Add custom tools** and test integration
3. **Test with different models** (gemini-pro, etc.)
4. **Test parallel execution** with multiple subagents
5. **Load testing** with many concurrent requests

Happy testing! 🧪
