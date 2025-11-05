# Patterns Chat App - FAQ

## General Questions

### Q: What is the Patterns Chat App?
**A:** It's an AI-powered learning tool that helps you master Effect-TS by combining:
- Google Gemini 2.5 Flash AI for intelligent responses
- 754+ indexed patterns from the Effect-TS community
- Conversation memory and history
- Pattern matching that finds relevant examples for your questions

### Q: Is it free?
**A:** Yes! The app is free to use. It runs locally with your API keys.

### Q: Do I need an account?
**A:** No, you can use it as a guest, but creating an account lets you save your chat history and preferences.

### Q: What's different from ChatGPT?
**A:** This app is specifically tuned for Effect-TS with:
- Access to a comprehensive pattern database
- Automatic pattern retrieval for Effect questions
- Context-aware responses focused on best practices
- Conversation memory stored locally

---

## Using the App

### Q: How do I ask questions?
**A:** Simply type your question about Effect-TS and press Enter. Examples:
- "How do I handle errors in Effect?"
- "What's the best retry strategy?"
- "Explain dependency injection"

### Q: Why does the first response take so long?
**A:** The first chat message takes 5-10 seconds because the AI:
1. Searches the pattern database (1-2s)
2. Generates a response from Gemini (3-5s)
3. Stores your conversation in memory (1s)

Subsequent messages are usually faster (3-5s).

### Q: Can I ask non-Effect questions?
**A:** Yes, but you'll get better responses about Effect-TS topics. Non-Effect questions will be answered but won't have pattern context.

### Q: What if the response is wrong or unhelpful?
**A:** 
1. Click the feedback button
2. Describe what was wrong
3. We use this to improve patterns and responses
4. Try rephrasing your question with different keywords

### Q: Can I have multiple conversations?
**A:** Yes! Click "New Chat" to start a fresh conversation. Your previous chats are saved in History.

---

## Patterns & Features

### Q: What are "patterns"?
**A:** Patterns are proven, tested approaches to solving common problems in Effect-TS. They include:
- Code examples
- Use cases
- Performance considerations
- Related patterns
- Learning progression

### Q: How are patterns selected?
**A:** The pattern matching algorithm:
1. Analyzes your question for keywords
2. Searches 640+ pattern types
3. Ranks by relevance (40% Effect specificity, 35% topic match, 25% learning value)
4. Returns top matches to the AI

### Q: Can I view patterns directly?
**A:** Yes, patterns are searchable in the app sidebar. You can:
- Search by name
- Filter by difficulty level
- Filter by category
- View detailed pattern info

### Q: Are patterns constantly updated?
**A:** Yes! The pattern database is updated regularly with:
- New Effect-TS best practices
- Community-contributed patterns
- Emerging techniques

### Q: Can I contribute patterns?
**A:** Not through the app, but you can contribute to the main Effect-Patterns repository.

---

## AI Models

### Q: Which AI model should I use?
**A:** Default recommendation:
- **Gemini 2.5 Flash** (default) - Fastest, best for most questions
- **Grok Reasoning** - For complex problems needing deep reasoning
- **Claude 4.5 Haiku** - Alternative high-quality responses
- **GPT Models** - If you have API access configured

### Q: Can I switch models mid-conversation?
**A:** Yes! Click the model selector (top of chat) to switch. The new model will start fresh but can see your previous messages.

### Q: What's the difference between models?
**A:** 
- **Speed**: Gemini fastest, Claude/GPT slightly slower
- **Reasoning**: Grok best, Claude/GPT good, Gemini adequate
- **Cost**: Gemini free tier, others may require API keys
- **Knowledge**: All similar for Effect-TS

### Q: Which model is best for different questions?

| Question Type | Recommended Model |
|---|---|
| Basic concepts | Gemini 2.5 Flash |
| Complex architecture | Grok Reasoning |
| Code review | Claude 4.5 Haiku |
| Performance | Any (similar) |
| Testing strategies | Gemini 2.5 Flash |

---

## Data & Privacy

### Q: Where is my data stored?
**A:** 
- Chat history: Local database
- Conversation embeddings: Supermemory (secure cloud)
- User preferences: Local storage

### Q: Is my data private?
**A:** Yes:
- Your chats are only visible to you
- Not shared with other users
- Not used to train models
- Can be deleted anytime

### Q: Can I export my conversations?
**A:** Yes! Options include:
- Download as PDF
- Share via link
- Export as JSON
- Copy to clipboard

### Q: What happens if I delete a conversation?
**A:** It's permanently deleted and cannot be recovered.

### Q: Can I use this offline?
**A:** No, the app requires internet for:
- AI responses
- Pattern retrieval
- Conversation storage

---

## Technical Questions

### Q: What technology does this use?
**A:** 
- **Frontend**: Next.js 16, React, TypeScript
- **Backend**: Node.js, TypeScript
- **AI**: Google Gemini 2.5 Flash (default)
- **Database**: PostgreSQL for chat history
- **Memory**: Supermemory for pattern retrieval
- **Patterns**: 754+ indexed Effect-TS patterns

### Q: Is this open source?
**A:** The patterns are open source in the Effect-Patterns repository. The chat app source is available on GitHub.

### Q: Can I self-host this?
**A:** Yes! Instructions available in the repository README.

### Q: What's my API key used for?
**A:** 
- **Google Gemini API Key**: Powers AI responses
- **Supermemory API Key**: Stores and retrieves patterns
- **Database URL**: Stores your chat history

Keys are only used for these purposes.

---

## Troubleshooting

### Q: Chat isn't responding
**A:** Try:
1. Wait 10 seconds (first response is slower)
2. Check internet connection
3. Refresh the page
4. Clear browser cache
5. Try a different model
6. Check if server is running

### Q: Patterns aren't appearing in responses
**A:** 
1. Try rephrasing with Effect keywords
2. Ask about specific concepts
3. Check if question relates to Effect-TS
4. Look at pattern search sidebar for examples

### Q: Can't log in
**A:**
1. Check username/password
2. Try "Guest" login
3. Clear browser cookies
4. Refresh the page
5. Check if server is running

### Q: Model selector doesn't show options
**A:**
1. Refresh page
2. Check console for errors
3. Verify internet connection
4. Try different browser

### Q: Responses are always the same
**A:**
1. Vary your questions more
2. Ask follow-ups
3. Try a different model
4. Check if patterns are loading

### Q: App is slow
**A:**
1. Check internet speed
2. Try Gemini 2.5 Flash (fastest)
3. Close other tabs/apps
4. Clear browser cache
5. Check server resources

---

## Learning Questions

### Q: Where should I start learning Effect?
**A:** Ask the AI:
- "What is Effect-TS?"
- "Why should I use Effect?"
- "How do I create my first Effect?"

Then progress to more complex patterns.

### Q: How do I go from beginner to advanced?
**A:** Suggested progression:
1. **Beginner**: Basic concepts, Effect.gen, simple patterns
2. **Intermediate**: Composition, error handling, async
3. **Advanced**: Testing, performance, large-scale apps

Ask progressively more specific questions at each level.

### Q: Can this replace the official docs?
**A:** No, use this as a learning companion. Always check:
- Official Effect-TS documentation
- Pattern database
- Community examples
- The AI for clarification

### Q: How much of Effect will this teach me?
**A:** This covers:
- ✅ Core concepts and patterns
- ✅ Common use cases
- ✅ Best practices
- ❌ Bleeding-edge experimental features
- ❌ Internal implementation details

For advanced topics, refer to official docs.

---

## Feedback & Support

### Q: How do I report a bug?
**A:** Click the feedback button in the app and describe:
1. What you did
2. What happened
3. What you expected
4. Your browser/OS info

### Q: Can I suggest features?
**A:** Yes! Use the feedback button to suggest:
- New patterns
- Model improvements
- UI/UX changes
- Documentation

### Q: How do I contact support?
**A:** 
- Use in-app feedback
- Check GitHub issues
- Submit bug reports
- Ask for help in chat!

### Q: Where do I find more examples?
**A:**
- Pattern database (sidebar search)
- Official Effect-TS docs
- Community GitHub repos
- Ask the AI for examples

---

## Performance & Limits

### Q: Is there a limit to how many chats I can have?
**A:** No, unlimited chats. Storage depends on your database.

### Q: What's the maximum message length?
**A:** ~10,000 characters per message (very long, rarely needed).

### Q: Can I use this on mobile?
**A:** Yes, the app is responsive and works on:
- Desktop browsers
- Tablets
- Mobile phones

### Q: How many concurrent users can it support?
**A:** Depends on your deployment. Default setup: 10-50 concurrent users.

---

## Getting Help

### Q: Where can I find documentation?
**A:** 
- **User Guide**: Full guide in app
- **Quick Start**: 5-minute getting started
- **In-App Help**: Hover over icons
- **Feedback**: Use feedback button

### Q: Can I ask the AI for help using the app?
**A:** Yes! Ask questions like:
- "How do I save my chat?"
- "What does this button do?"
- "How do I change the model?"

The AI can explain app features too.

### Q: Where's the rest of the Effect-Patterns project?
**A:** 
- **Website**: https://effect.website
- **Docs**: https://docs.effect.website
- **GitHub**: https://github.com/Effect-Patterns
- **Discord**: Effect-TS community

---

## Still Have Questions?

🤔 **Try asking the chat directly!** The AI can help with:
- App usage questions
- Effect-TS concepts
- Pattern explanations
- Troubleshooting

The AI is your learning companion. Don't hesitate to ask!

---

**Last updated**: November 4, 2025

For the latest info, check the app or repository.
