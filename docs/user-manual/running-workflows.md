# Running Workflows

Executing workflows and viewing results.

## Starting Execution

### Run Button

Click the **Run** button in the toolbar to execute the current workflow.

### Menu

**Workflow → Run** or use the keyboard shortcut.

### Pre-run Validation

Before running, ADKFlow:
1. Validates all nodes
2. Checks required connections
3. Verifies configuration

If validation fails, you'll see warnings but can still run.

## Run Panel

When execution starts, the Run Panel appears at the bottom:

```
┌─────────────────────────────────────────────────────────────┐
│ Run Panel                                        [Cancel] [×]│
├─────────────────────────────────────────────────────────────┤
│ ▶ Starting workflow...                                      │
│ ▶ Executing: analyze_agent                                  │
│ ▶ Agent response: "The analysis shows..."                   │
│ ▶ Executing: summarize_agent                                │
│ ✓ Workflow completed                                        │
└─────────────────────────────────────────────────────────────┘
```

### Event Stream

Real-time events appear as the workflow runs:
- **Starting**: Workflow begins
- **Executing**: Node starts processing
- **Response**: Agent outputs
- **Completed**: Node finishes
- **Error**: Something went wrong

### Scrolling

- New events appear at the bottom
- Scroll up to see history
- Auto-scroll resumes when scrolled to bottom

## Node States During Execution

Nodes visually indicate their state:

| State | Appearance |
|-------|------------|
| **Pending** | Normal (waiting to run) |
| **Running** | Pulsing animation |
| **Completed** | Green indicator |
| **Error** | Red indicator |

## User Input

Some workflows require user input during execution.

### User Input Nodes

When a User Input node executes:
1. The Run Panel shows an input prompt
2. Workflow pauses
3. Enter your response
4. Click **Submit** to continue

### Agent Requests

Agents can request user input:
1. A dialog appears with the agent's question
2. Type your response
3. Submit to continue

## Cancelling Execution

### Cancel Button

Click **Cancel** in the Run Panel to stop execution:
- Current node finishes
- Remaining nodes are skipped
- Resources are cleaned up

### Force Stop

If cancel doesn't work:
1. Close the Run Panel
2. Refresh the page if needed

## Execution Order

### Single Tab

Nodes execute based on:
1. **Dependencies**: Inputs must be ready
2. **Hierarchy**: Parent agents before children
3. **Connections**: Data flows determine order

### Multi-Tab (Teleporters)

When using teleporters:
1. Source tab executes until Teleport Out
2. Data is sent to the channel
3. Target tab's Teleport In receives
4. Target tab continues execution

## Viewing Results

### Node Outputs

After execution:
1. Click a completed node
2. View output values in the expanded node
3. Output handles show transmitted data

### Run Panel History

The Run Panel shows:
- All events from the run
- Agent responses
- Error messages
- Timing information

### Probe Nodes

Use probes for detailed monitoring:
- **Input Probe**: See what enters a node
- **Output Probe**: See what exits a node
- **Log Probe**: Custom log messages

## Error Handling

### Error Display

When an error occurs:
1. The node shows a red indicator
2. Run Panel displays the error message
3. Execution may stop or continue (depending on settings)

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| **API Error** | Invalid API key or quota | Check GOOGLE_API_KEY |
| **Timeout** | Response took too long | Increase timeout or simplify prompt |
| **Connection Error** | Network issue | Check internet connection |
| **Type Error** | Incompatible data types | Check connections |

### Debugging

1. Add probe nodes at suspected failure points
2. Check the Run Panel for error details
3. Validate the workflow before running
4. Simplify and test incrementally

## Run History

Currently, ADKFlow does not persist run history. Each run:
- Starts fresh
- Shows results in Run Panel
- Clears on next run

## Tips

### Before Running

- Save your workflow
- Validate first (Workflow → Validate)
- Check API credentials

### Performance

- Simpler workflows run faster
- Parallel agents execute concurrently
- Cache-enabled nodes skip re-execution

### Debugging

- Start with small test cases
- Use probes liberally
- Check node states for failures

## See Also

- [Validation](./validation.md) - Pre-run validation
- [Nodes](./nodes.md) - Node types and states
- [Troubleshooting](./troubleshooting.md) - Common issues
