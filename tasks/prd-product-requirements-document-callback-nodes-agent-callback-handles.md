# Product Requirements Document: Callback Nodes & Agent Callback Handles

## Overview

Add input handles to Agent node callback fields and create a new CallbackNode that can connect to these handles. Callback nodes function similarly to ToolAgent nodes - they contain executable Python code that runs when the corresponding callback is triggered during agent execution.

## Goals

1. Enable visual callback connections in the flow editor
2. Provide a reusable CallbackNode that can be shared across multiple agents
3. Maintain backward compatibility with existing text-based callback definitions
4. Follow established patterns from ToolAgent/ToolNode implementation

## Non-Goals

- External file references for callback code (inline only)
- Removing existing text field callback functionality
- Custom callback types beyond the 6 ADK-supported callbacks

## Technical Design

### 1. Agent Node Callback Handles

**Location**: Right side of each callback text field in the expanded Callbacks tab (similar to prompt field handle positioning)

**Handle Configuration**:
```typescript
// 6 new input handles on Agent node
{
  id: 'before_agent_callback',
  type: 'target',
  position: 'right',
  handleType: 'callback',
}
// Repeat for: after_agent, before_model, after_model, before_tool, after_tool
```

**Visual Behavior**:
- Handles appear inline with their corresponding text fields
- Handle appears on the right edge of the callback field row
- Only visible when Agent node is expanded and Callbacks tab is active

### 2. CallbackNode

**Visual Style**: Copy from ToolNode (compact 48x48 square)

**Compact View**: Shows only icon and callback name (callback type selector hidden, visible only in editor)

**Node Properties**:
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique node identifier |
| `name` | string | Display name for the callback |
| `callback_type` | enum | One of: before_agent, after_agent, before_model, after_model, before_tool, after_tool |
| `code` | string | Python code to execute |

**Handle Configuration**:
- Single output handle (source) of type `callback`
- Handle compatible with Agent node callback input handles

**Code Editor**:
- Inline code editor (Monaco) like ToolAgent pattern
- Pre-populated function signature based on `callback_type`:
  ```python
  # before_model callback signature
  async def callback(callback_context: CallbackContext, llm_request: LlmRequest) -> Optional[LlmResponse]:
      pass
  
  # after_model callback signature  
  async def callback(callback_context: CallbackContext, llm_response: LlmResponse) -> LlmResponse:
      pass
  
  # before_tool/after_tool callback signature
  async def callback(tool: BaseTool, args: dict[str, Any], tool_context: ToolContext) -> Optional[dict]:
      pass
  
  # before_agent/after_agent callback signature
  async def callback(callback_context: CallbackContext) -> Optional[Content]:
      pass
  ```

### 3. Edge Type

**New Edge Type**: `callback` (similar to existing `tool`, `sub-agent` edge types)

**Validation Rules**:
- CallbackNode can only connect to matching callback type handles
- OR: CallbackNode `callback_type` is set automatically based on connected handle
- **Fan-out supported**: One CallbackNode can connect to multiple Agents (many:1 from CallbackNode to Agent handles)
- One callback input handle can only have one connected CallbackNode (1:1 from Agent handle to CallbackNode)

### 4. Runner Integration

**Code Generation** (in `adkflow-runner`):
- When Agent has connected CallbackNode, generate callback function from node's code
- Inject callback into Agent instantiation
- Priority: Connected CallbackNode takes precedence over text field value

**Execution**:
- CallbackNode code wrapped in async function with appropriate signature
- Error handling follows ToolAgent patterns
- **Execution logging**: Show callback execution logs in the CallbackNode during runs (similar to ToolAgent execution feedback)

### 5. Backward Compatibility

- Existing text fields remain functional
- If both text field AND connected CallbackNode exist:
  - Connected CallbackNode takes precedence
  - Show visual indicator on text field (dimmed or info icon)
- Flows without CallbackNodes continue to work unchanged

## User Experience

### Creating a Callback

1. Drag CallbackNode from palette onto canvas
2. Double-click to open code editor
3. Select callback type from dropdown (or auto-detect from connection)
4. Write callback code
5. Connect output handle to Agent's callback input handle

### Editing Callbacks

- Double-click CallbackNode to open code editor panel
- Same UX as ToolAgent code editing

### Visual Feedback

- Connected callback handles show filled state
- Disconnected handles show empty/outline state
- Text fields with connected callbacks show "overridden" state

## Files to Modify

### Frontend (`packages/frontend/`)

| File | Changes |
|------|---------|
| `src/components/nodes/CallbackNode.tsx` | **NEW** - CallbackNode component |
| `src/components/nodes/AgentNode.tsx` | Add callback input handles to Callbacks tab |
| `src/components/nodes/index.ts` | Export CallbackNode |
| `src/types/nodes.ts` | Add CallbackNode type definition |
| `src/types/handles.ts` | Add callback handle type |
| `src/stores/flowStore.ts` | Handle CallbackNode CRUD operations |
| `src/constants/nodeTypes.ts` | Register CallbackNode type |

### Backend (`packages/adkflow-runner/`)

| File | Changes |
|------|---------|
| `src/adkflow_runner/models/nodes.py` | Add CallbackNode model |
| `src/adkflow_runner/generator/agent.py` | Generate callback functions from connected nodes |
| `src/adkflow_runner/generator/callbacks.py` | **NEW** - Callback code generation utilities |

### Shared Types

| File | Changes |
|------|---------|
| `packages/shared/src/types/` | Add CallbackNode to shared type definitions |

## Acceptance Criteria

- [ ] Agent node displays 6 callback input handles (right side of callback fields in expanded Callbacks tab)
- [ ] CallbackNode can be created and styled like ToolNode (48x48 compact)
- [ ] CallbackNode has inline code editor with appropriate function signature
- [ ] CallbackNode can connect to Agent callback handles
- [ ] Connected callbacks execute during agent run
- [ ] Text field callbacks still work when no node connected
- [ ] Connected CallbackNode overrides text field value
- [ ] Runner generates valid ADK callback code from CallbackNode

## Resolved Questions

1. **Should CallbackNode support connecting to multiple Agents (fan-out)?** → **Yes** - One CallbackNode can connect to multiple Agent callback handles
2. **Should we show callback execution logs in the CallbackNode during runs?** → **Yes** - Display execution logs similar to ToolAgent
3. **Should callback type selector be visible on compact node or only in editor?** → **Only in editor** - Compact node shows just icon and name