# Patterns Chat App - User Guide

Welcome to **Patterns Chat App** - your AI-powered guide to Effect-TS patterns and best practices!

## What is Patterns Chat App?

Patterns Chat App is an intelligent chat interface that helps you learn and master Effect-TS by:
- Answering your Effect-TS questions with AI guidance
- Retrieving relevant patterns from a comprehensive database (754+ patterns)
- Storing your conversation history for future reference
- Providing context-aware responses powered by Google Gemini

## Getting Started

### 1. Access the App
Open your browser and navigate to:
```
http://localhost:3000
```

### 2. Authentication
- Click **Login** to create an account or sign in
- Or click **Guest** to browse without an account
- Your chat history is saved automatically

### 3. Start a New Chat
1. Click the **New Chat** button
2. Type your Effect-TS question in the message box
3. Press Enter or click Send
4. The AI will respond with pattern guidance

## Asking Great Questions

### Questions That Work Best

Ask about specific Effect-TS topics:
- **"How do I handle errors in Effect?"**
- **"What's the best way to do retries?"**
- **"How does dependency injection work in Effect?"**
- **"Explain Effect.gen to me"**
- **"What's the difference between Effect and Promise?"**

### Example Queries

#### Error Handling
```
Q: How do I catch and recover from errors in Effect?
A: [AI provides error handling patterns with code examples]
```

#### Async Operations
```
Q: How do I run multiple Effects in parallel?
A: [AI suggests concurrent execution patterns]
```

#### Testing
```
Q: How do I test Effect code?
A: [AI provides testing patterns and best practices]
```

#### Type Safety
```
Q: How does Effect's type system help prevent bugs?
A: [AI explains type-driven development patterns]
```

## Features

### 💬 Smart Conversation
- **AI-Powered**: Responses from Google Gemini 2.5 Flash
- **Pattern-Aware**: Automatically retrieves relevant patterns from database
- **Contextual**: Remembers your chat history within a conversation
- **Multi-Turn**: Ask follow-up questions, the AI maintains context

### 📚 Pattern Database
- **640+ Pattern Types**: Covers all major Effect-TS domains
- **754+ Indexed Memories**: Comprehensive coverage of patterns and examples
- **Auto-Matched**: Relevant patterns automatically included in responses
- **Learning-Focused**: Patterns designed to teach concepts progressively

### 💾 Conversation Memory
- **Auto-Saved**: All conversations stored automatically
- **Searchable**: Find past conversations via chat history
- **Tagged**: Important patterns are tagged for quick reference
- **Exportable**: Download or share conversations

### 🎯 Model Selection
Switch between different AI models for different use cases:
- **Gemini 2.5 Flash** (default) - Fast, efficient, ideal for most queries
- **Grok Reasoning** - Advanced reasoning for complex problems
- **Claude 4.5 Haiku** - Alternative high-quality model
- **GPT Models** - Available if you have API access

**To change model**:
1. Click the model selector (top of chat)
2. Choose a different model
3. Model selection is saved for future chats

## Understanding Responses

### Pattern References
When the AI mentions patterns, you'll see:
```
Effect provides several patterns for error handling:
* Retry with Exponential Backoff - for transient errors
* Creating Simple Effects - fundamental error handling
```

**What this means**:
- These are tested, documented approaches
- Code examples available in Effect-TS documentation
- Patterns are ranked by relevance to your question

### Follow-Up Questions
After a response, ask:
- **"Show me an example"** - Get code examples
- **"Explain [concept]"** - Deeper explanation
- **"How does this compare to...?"** - Comparisons
- **"What about performance?"** - Performance implications

### Tips for Better Responses
1. **Be Specific**: "How do I handle retries?" vs "Tell me about Effect"
2. **Show Context**: "I'm building a web API, how do I..."
3. **Ask About Trade-offs**: "What are the pros and cons of..."
4. **Request Examples**: "Can you show me code for..."

## Chat Management

### View Chat History
1. Click **History** in the sidebar
2. See all your past conversations
3. Click a conversation to view it
4. Delete conversations you no longer need

### Share a Conversation
1. Open a conversation
2. Click the Share button (top right)
3. Copy the share link or export as PDF
4. Share with teammates

### Search Patterns
- Use the search box in the sidebar
- Search by pattern name, category, or skill level
- Find patterns you've discussed before

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line in message |
| `Ctrl/Cmd + K` | Search/open quick search |
| `Ctrl/Cmd + N` | New chat |
| `Ctrl/Cmd + ,` | Open settings |

## Settings & Preferences

### User Preferences
Click the settings icon (⚙️) to configure:
- **Theme**: Light or Dark mode
- **Model Selection**: Choose default AI model
- **Auto-Save**: Enable/disable automatic saving
- **Notifications**: Chat activity alerts

### Privacy
- Your conversations are private
- Not shared with other users
- Deletion is permanent

## Troubleshooting

### Chat Not Responding
**Problem**: AI doesn't respond to questions
**Solution**:
1. Wait a few seconds (first response takes 5-10s)
2. Check your internet connection
3. Try refreshing the page
4. Try a different model

### Pattern Not Found
**Problem**: Expected patterns don't appear
**Solution**:
1. Rephrase your question with Effect-TS keywords
2. Try "I'm learning about [topic]"
3. Ask about specific concepts

### Can't Save Chat
**Problem**: Conversation not saved
**Solution**:
1. Check if you're logged in (top right)
2. Try logging out and back in
3. Clear browser cache
4. Contact support if problem persists

## Tips & Tricks

### 🎓 Learning Progression
- **Start with**: "What is Effect-TS?"
- **Then ask**: "How do I create an Effect?"
- **Progress to**: "How do I compose Effects?"
- **Advanced**: "How do I test complex Effect workflows?"

### 🔍 Deep Dives
Ask the AI to explain gradually:
1. "Explain [concept] in simple terms"
2. "Now show me intermediate details"
3. "What are the advanced aspects?"

### 💡 Problem Solving
When stuck on a problem:
1. "I'm trying to [do something], but [issue happens]"
2. "What patterns might help?"
3. "Can you show me example code?"

### 📝 Taking Notes
The app stores conversation history, but:
- Consider taking screenshots of important responses
- Export conversations for offline reading
- Share responses with your team

## Best Practices

### ✅ Do
- Ask specific, focused questions
- Reference what you're building
- Ask follow-up questions
- Provide context about your use case
- Ask for code examples

### ❌ Don't
- Ask about non-Effect topics
- Expect immediate responses to complex questions
- Rely solely on AI without reading official docs
- Share sensitive information in chats
- Ignore error messages

## Getting Help

### Resources
- **Effect-TS Docs**: https://effect.website
- **Pattern Database**: Available in sidebar
- **Examples**: Available with each pattern

### Contact
- **Report Issues**: Use the feedback button
- **Suggest Features**: Share ideas in settings
- **Questions**: Ask in the chat! The AI helps with usage too

## FAQ

### Q: Is my data private?
**A**: Yes, your conversations are private and encrypted. Not shared unless you explicitly share.

### Q: Can I use this offline?
**A**: No, the chat requires internet for AI responses and pattern retrieval.

### Q: What models are available?
**A**: Gemini 2.5 Flash (default), Grok Reasoning, Claude, and GPT models if configured.

### Q: How often are patterns updated?
**A**: Patterns are updated regularly as new Effect-TS best practices emerge.

### Q: Can I export my learning?
**A**: Yes! Export conversations as PDF or share links with others.

### Q: What if I find incorrect information?
**A**: Use the feedback button to report issues. Help us improve!

## Keyboard & Accessibility

### Screen Reader Support
- Full keyboard navigation
- ARIA labels on all elements
- High contrast mode available

### Mobile Support
- Responsive design
- Touch-optimized buttons
- Mobile keyboard support

## Next Steps

1. **Login/Register** - Create your account
2. **Ask Your First Question** - "What is Effect-TS?"
3. **Explore Patterns** - Click on suggested patterns
4. **Build Something** - Apply patterns to your projects
5. **Share Knowledge** - Share helpful responses with your team

---

**Happy learning with Effect-TS!** 🚀

For more information, visit the [Effect-TS Website](https://effect.website) or check the [Pattern Database](/) in the app.
