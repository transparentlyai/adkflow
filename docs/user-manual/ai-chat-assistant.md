# AI Chat Assistant

The AI Chat Assistant is a built-in conversational AI that helps you work more effectively in ADKFlow. It can assist with prompt engineering, workflow design, troubleshooting, and general questions.

## Overview

The AI Assistant appears as a side panel that you can open from anywhere in the application. It maintains conversation history within each session, so you can have ongoing discussions about your work.

## Opening the Assistant

The AI Chat can be invoked programmatically by components throughout the application. When integrated into a feature (like prompt editing), you'll see an AI icon or "AI Assist" button that opens the chat panel.

## Using the Chat

### Starting a Conversation

1. Click an AI Assist button or trigger to open the chat panel
2. The panel slides in from the right side of the screen
3. Type your message in the text input at the bottom
4. Press **Enter** to send (or click the send button)

### Multi-turn Conversations

The assistant remembers your conversation history within each session:

- Follow up on previous responses
- Ask clarifying questions
- Refine suggestions through iteration
- Build on earlier context

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Send message | Enter |
| New line | Shift + Enter |

## Context Awareness

When opened from specific features, the assistant automatically knows about your current context:

- **From prompt editors**: The assistant sees your current prompt and can suggest improvements
- **From workflow views**: The assistant understands your current workflow structure
- **From error states**: The assistant can help troubleshoot issues

This context is passed automatically, so you don't need to copy and paste information.

## Model Configuration

The AI Assistant uses the model configured in your project settings:

1. Go to **Settings** (gear icon)
2. Find the **Default Model** option
3. Select your preferred model

The assistant will use this model for all conversations. Different models may have different capabilities and response styles.

## Tips for Effective Use

### Be Specific

Instead of:
> "Help me with my prompt"

Try:
> "My prompt for summarizing articles is too verbose. Can you help me make it more concise while keeping the key instructions?"

### Provide Context

If the assistant doesn't have automatic context, share relevant information:
> "I'm building a customer service agent. The agent needs to handle refund requests and should always verify the order number first."

### Iterate

Don't expect perfect results on the first try:
1. Start with your initial question
2. Review the response
3. Ask for modifications: "Can you make it shorter?" or "Add more examples"
4. Refine until you're satisfied

### Use for Different Tasks

The assistant can help with:

- **Prompt Engineering**: Improve prompts, add examples, clarify instructions
- **Workflow Design**: Plan agent architectures, suggest patterns
- **Troubleshooting**: Debug issues, understand errors
- **Learning**: Explain concepts, provide examples
- **Best Practices**: Get recommendations for effective agent design

## Session Management

### Persistent Sessions

Conversations are tied to session IDs. When you open the assistant from the same context (e.g., the same prompt editor), it remembers your previous conversation.

### Fresh Sessions

Opening from a different context or after certain actions may start a fresh conversation. This ensures the assistant has the right context for your current task.

### Clearing History

Close the chat panel and reopen to continue from where you left off. Sessions persist until the application restarts.

## Error Handling

If an error occurs:

1. An error banner appears at the top of the chat
2. Click the X to dismiss the error
3. Try sending your message again

Common errors:
- **Network issues**: Check your internet connection
- **Model unavailable**: Try a different model in settings
- **Rate limits**: Wait a moment and retry

## Privacy

Your conversations with the AI Assistant:
- Are sent to the configured LLM provider (Google AI)
- Follow your project's model configuration
- Are not stored permanently on disk
- Are cleared when the application restarts

## Troubleshooting

### Chat won't open

- Ensure you have a project open
- Check that the AI Chat panel isn't already open (look on the right side)
- Refresh the page and try again

### Responses are slow

- Longer prompts and conversations take more time
- Complex questions require more processing
- Try a faster model if available

### Unexpected responses

- Check if context was passed correctly
- Provide more specific instructions
- Try rephrasing your question

### Panel is empty

- Click in the text input area to focus it
- Type a message and press Enter
- Check the browser console for errors

## See Also

- [Getting Started](./getting-started.md) - First steps with ADKFlow
- [Prompts & Contexts](./prompts-and-contexts.md) - Working with prompts
- [Troubleshooting](./troubleshooting.md) - General troubleshooting
- [Technical Documentation](../technical/ai-chat-service.md) - Developer guide
