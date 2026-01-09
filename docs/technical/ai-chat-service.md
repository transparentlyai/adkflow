# AI Chat Service

A flexible, built-in AI chat service for ADKFlow that provides session-based conversations with configurable system prompts, context passing, and streaming responses.

## Overview

The AI Chat Service enables conversational AI assistance throughout the application. It can be invoked from any component to provide contextual help, prompt engineering assistance, or general AI interaction.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  AiChatProvider (Context)                                        │
│    ├── useAiChat() hook - open/close/send                       │
│    └── AiChatPanel - Side panel UI                              │
├─────────────────────────────────────────────────────────────────┤
│  API Client (lib/api/chat.ts)                                   │
│    └── Fetch + SSE for streaming                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/SSE
┌───────────────────────────▼─────────────────────────────────────┐
│                        Backend (FastAPI)                         │
├─────────────────────────────────────────────────────────────────┤
│  chat_routes.py                                                  │
│    ├── POST /api/chat/sessions                                  │
│    ├── GET  /api/chat/sessions/{id}                             │
│    ├── POST /api/chat/sessions/{id}/messages (SSE stream)       │
│    └── DELETE /api/chat/sessions/{id}                           │
├─────────────────────────────────────────────────────────────────┤
│  ChatService                                                     │
│    ├── Session management (in-memory)                           │
│    └── LLM integration (Google AI)                              │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Implementation

### Data Models

Located in `backend/src/models/chat.py`:

```python
class ChatMessage(BaseModel):
    """Single message in a chat session."""
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime

class ChatSessionConfig(BaseModel):
    """Configuration for a chat session."""
    system_prompt: str | None = None  # Custom system prompt
    context: dict[str, Any] | None = None  # Arbitrary context data
    model: str | None = None  # Override project default model

class ChatSession(BaseModel):
    """A chat session with message history."""
    id: str
    config: ChatSessionConfig
    messages: list[ChatMessage]
    created_at: datetime
    updated_at: datetime

class ChatStreamEvent(BaseModel):
    """SSE event for streaming responses."""
    type: Literal["content", "done", "error"]
    content: str | None = None
    error: str | None = None
```

### Chat Service

Located in `backend/src/services/chat_service.py`:

The `ChatService` class manages:
- **Session storage**: In-memory dictionary keyed by session ID
- **LLM integration**: Uses `google.genai` SDK for streaming responses
- **Model configuration**: Uses project settings or session override

Key methods:

```python
def create_session(session_id: str, config: ChatSessionConfig) -> ChatSession
def get_session(session_id: str) -> ChatSession | None
def delete_session(session_id: str) -> bool
async def send_message(session_id: str, content: str, project_path: str | None) -> AsyncGenerator[ChatStreamEvent, None]
```

#### LLM Message Format

The service converts session history to the Google AI format:

```python
# System prompt becomes first message
if session.config.system_prompt:
    messages.append(types.Content(
        role="user",
        parts=[types.Part.from_text(text=system_prompt)]
    ))
    messages.append(types.Content(
        role="model",
        parts=[types.Part.from_text(text="Understood.")]
    ))

# Session history
for msg in session.messages:
    role = "user" if msg.role == "user" else "model"
    messages.append(types.Content(
        role=role,
        parts=[types.Part.from_text(text=msg.content)]
    ))
```

### API Routes

Located in `backend/src/api/routes/chat_routes.py`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/sessions` | POST | Create new session |
| `/api/chat/sessions/{session_id}` | GET | Get session with history |
| `/api/chat/sessions/{session_id}` | DELETE | Delete session |
| `/api/chat/sessions/{session_id}/messages` | POST | Send message (SSE stream) |

#### SSE Streaming

Messages are streamed using Server-Sent Events:

```python
@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    project_path: str | None = Query(None)
):
    async def event_generator():
        async for event in chat_service.send_message(
            session_id, request.content, project_path
        ):
            yield {
                "event": event.type,
                "data": json.dumps(event.model_dump(exclude_none=True))
            }
    return EventSourceResponse(event_generator())
```

## Frontend Implementation

### TypeScript Types

Located in `frontend/lib/types/chat.ts`:

```typescript
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface ChatSessionConfig {
  systemPrompt?: string;
  context?: Record<string, unknown>;
  model?: string;
}

export interface ChatSession {
  id: string;
  config: ChatSessionConfig;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface OpenChatOptions {
  sessionId: string;
  systemPrompt?: string;
  context?: Record<string, unknown>;
  model?: string;
  initialMessage?: string;  // Auto-send first message
  onContentReturn?: (content: string) => void;  // Callback for "Use it" button
}

export interface AiChatContextValue {
  isOpen: boolean;
  session: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  openChat: (options: OpenChatOptions) => Promise<void>;
  closeChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
  acceptContent: (content: string) => void;  // Trigger onContentReturn callback
}
```

### API Client

Located in `frontend/lib/api/chat.ts`:

```typescript
// Create a new session
export async function createChatSession(
  sessionId: string,
  config?: ChatSessionConfig
): Promise<ChatSession>

// Get existing session
export async function getChatSession(sessionId: string): Promise<ChatSession | null>

// Delete session
export async function deleteChatSession(sessionId: string): Promise<void>

// Stream message response
export function streamChatMessage(
  sessionId: string,
  content: string,
  projectPath: string | undefined,
  onEvent: (event: ChatStreamEvent) => void,
  onError: (error: Error) => void
): () => void  // Returns cleanup function
```

The `streamChatMessage` function uses the Fetch API with SSE parsing:

```typescript
fetch(url.toString(), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  },
  body: JSON.stringify({ content }),
  signal: controller.signal,
})
```

### React Context

Located in `frontend/components/AiChat/AiChatProvider.tsx`:

The `AiChatProvider` component manages:
- **Open/close state**: Controls panel visibility
- **Session management**: Creates or loads existing sessions
- **Message state**: Tracks conversation history
- **Streaming**: Handles real-time response updates
- **Error handling**: Captures and displays errors

```tsx
import { AiChatProvider, useAiChat } from "@/components/AiChat";

// Wrap your app
<AiChatProvider>
  {children}
  <AiChatPanel />
</AiChatProvider>

// Use the hook in any component
function MyComponent() {
  const { openChat, sendMessage, messages } = useAiChat();

  const handleAiAssist = () => {
    openChat({
      sessionId: `my-feature-${Date.now()}`,
      systemPrompt: "You are a helpful assistant.",
      context: { currentData: someData },
    });
  };
}
```

### Chat Panel UI

Located in `frontend/components/AiChat/AiChatPanel.tsx`:

Components:
- **Sheet**: Side panel container from Radix UI (non-modal)
- **MessageBubble**: Renders individual messages with avatars
- **WelcomeMessage**: Empty state with helpful text
- **ErrorBanner**: Displays errors with dismiss button
- **ContentBlock**: Monaco editor for AI-suggested content with "Use it" button
- **Composer**: Text input with send button

Features:
- Auto-scroll to latest message
- Streaming indicator with typing cursor
- Enter to send, Shift+Enter for new line
- Auto-resize textarea
- **Resizable panel**: Drag left edge (400-900px width)
- **Non-modal**: Canvas interaction allowed while open
- **Markdown rendering**: Responses rendered with react-markdown

### Content Return Mechanism

The chat supports returning content to the originating component:

```
┌─────────────────────────────────────────────────────────────────┐
│  CustomNode (prompt)                                             │
│    └── openChat({ onContentReturn: (content) => updateConfig() })│
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  AiChatProvider                                                  │
│    └── Stores onContentReturn callback in ref                   │
│    └── Exposes acceptContent() method to trigger callback       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│  AiChatPanel                                                     │
│    └── MessageBubble detects <content>...</content> in messages │
│    └── Renders ContentBlock with Monaco editor + "Use it" btn   │
│    └── "Use it" calls acceptContent() → closes chat → callback  │
└─────────────────────────────────────────────────────────────────┘
```

System prompts instruct the AI to wrap final suggestions in `<content>` tags:

```markdown
When you present the final prompt, wrap it in XML tags:

<content>
[The complete prompt here]
</content>
```

### ContentBlock Component

Located in `frontend/components/AiChat/ContentBlock.tsx`:

A readonly Monaco editor with copy/accept actions:

```tsx
interface ContentBlockProps {
  content: string;
  onAccept: () => void;
}
```

Features:
- Monaco editor with markdown syntax highlighting
- Resizable height (drag bottom edge, 80-500px)
- "Copy" button to copy content to clipboard
- "Use it" button to accept and return content

## Integration Guide

### Opening Chat from a Component

```tsx
import { useAiChat } from "@/components/AiChat";
import { Sparkles } from "lucide-react";

function PromptEditor({ nodeId, promptContent }) {
  const { openChat } = useAiChat();

  const handleAiAssist = () => {
    openChat({
      // Use a unique session ID to maintain conversation history
      sessionId: `prompt-editor-${nodeId}`,

      // Customize the AI's behavior
      systemPrompt: `You are a prompt engineering expert. Help the user improve their prompts for AI agents.

Current prompt being edited:
${promptContent}

Provide specific, actionable suggestions.`,

      // Pass any relevant context
      context: {
        nodeId,
        nodeType: "prompt",
        promptLength: promptContent.length,
      },

      // Optionally override the model
      model: "gemini-2.0-flash-exp",
    });
  };

  return (
    <button onClick={handleAiAssist}>
      <Sparkles className="h-4 w-4" />
      AI Assist
    </button>
  );
}
```

### Session ID Conventions

Use consistent session IDs to maintain conversation history:

| Context | Session ID Pattern |
|---------|-------------------|
| Prompt editor | `prompt-${nodeId}` |
| Context editor | `context-${nodeId}` |
| Workflow help | `workflow-${tabId}` |
| General help | `general-${userId}` |

### Error Handling

```tsx
function MyComponent() {
  const { openChat, error, clearError } = useAiChat();

  useEffect(() => {
    if (error) {
      // Log error for debugging
      console.error("Chat error:", error);

      // Show toast notification
      toast.error(error);

      // Clear error after showing
      clearError();
    }
  }, [error, clearError]);
}
```

### Content Return from AI

To receive content back from the AI (like suggested prompts):

```tsx
function PromptEditor({ nodeId, content, onContentChange }) {
  const { openChat } = useAiChat();

  const handleAiAssist = (action: "create" | "fix") => {
    openChat({
      sessionId: `prompt-${nodeId}-${action}`,
      systemPrompt: action === "create"
        ? PROMPT_CREATOR_SYSTEM_PROMPT
        : PROMPT_FIXER_SYSTEM_PROMPT.replace("{content}", content),
      initialMessage: action === "create"
        ? "Help me create a prompt"
        : "Help me fix this prompt",
      // This callback is invoked when user clicks "Use it"
      onContentReturn: (newContent) => {
        onContentChange(newContent);
      },
    });
  };
}
```

## System Prompts

Located in `frontend/lib/aiPrompts.ts`:

Pre-defined system prompts for AI assistance features:

| Export | Purpose |
|--------|---------|
| `PROMPT_CREATOR_SYSTEM_PROMPT` | Guides AI to help create prompts from scratch |
| `PROMPT_FIXER_SYSTEM_PROMPT` | Guides AI to fix/improve existing prompts |

Both prompts instruct the AI to use `<content>` tags for final output.

## Configuration

### Model Selection

The chat service uses models in this priority order:
1. Session config `model` (if specified)
2. Project settings default model
3. Fallback: `gemini-2.0-flash-exp`

### Project Settings Integration

The service reads model configuration from project settings:

```python
# In chat_service.py
if project_path:
    settings = load_project_settings(project_path)
    if settings.get("default_model"):
        model_name = settings["default_model"]
```

## File Structure

```
backend/src/
├── models/
│   └── chat.py           # Pydantic models
├── services/
│   └── chat_service.py   # Business logic
└── api/routes/
    └── chat_routes.py    # API endpoints

frontend/
├── components/AiChat/
│   ├── index.ts          # Barrel exports
│   ├── AiChatProvider.tsx # React context
│   ├── AiChatPanel.tsx   # Chat UI with markdown rendering
│   └── ContentBlock.tsx  # Monaco editor for content return
├── components/nodes/custom/
│   └── AiAssistButton.tsx # AI Assist dropdown for prompt nodes
└── lib/
    ├── api/
    │   └── chat.ts       # API client
    ├── aiPrompts.ts      # System prompts for AI assistance
    └── types/
        └── chat.ts       # TypeScript types
```

## Testing

### Backend Testing

```bash
# Run backend tests
uv run pytest backend/tests/test_chat_service.py -v
```

### Manual API Testing

```bash
# Create session
curl -X POST http://localhost:8000/api/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-1", "config": {"systemPrompt": "You are helpful."}}'

# Send message (SSE stream)
curl -N -X POST "http://localhost:8000/api/chat/sessions/test-1/messages" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, what can you do?"}'

# Get session
curl http://localhost:8000/api/chat/sessions/test-1

# Delete session
curl -X DELETE http://localhost:8000/api/chat/sessions/test-1
```

### Frontend Testing

```bash
# Open chat via browser console
window.__aiChat?.openChat({
  sessionId: "manual-test",
  systemPrompt: "You are a helpful assistant."
});
```

## Future Enhancements

Potential improvements (not currently implemented):
- Session persistence to database
- Multiple concurrent sessions
- File/image attachments
- Tool/function calling within chat
- Chat history export
- Rate limiting
- Usage analytics

## See Also

- [User Guide: AI Chat Assistant](../user-manual/ai-chat-assistant.md)
- [API Reference](./backend/api-reference.md)
- [State Management](./frontend/state-management.md)
