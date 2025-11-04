/**
 * Guide to Memories
 *
 * Comprehensive documentation for the Supermemory-powered semantic search system
 * This guide explains how memories work and how users can benefit from them.
 */

export const memoriesGuide = {
  title: "Guide to Memories",
  description: "Learn how the Code Assistant remembers and learns from your conversations",
  sections: [
    {
      id: "what-are-memories",
      title: "What Are Memories?",
      content: `Memories are intelligent, searchable records of your conversations with the Code Assistant. Every chat you have is automatically stored with:

• The conversation content (your questions and the assistant's responses)
• Automatic tags (categories like "effect-ts", "error-handling", etc.)
• The outcome (was the issue solved, partial, unsolved, or revisited?)
• A satisfaction score (how helpful was the response?)
• Timestamps (when the conversation happened)

The system uses advanced semantic search to find similar past conversations, so you can discover solutions you've already explored without having to remember the exact details.`,
      icon: "💾",
    },
    {
      id: "how-memories-stored",
      title: "How Memories Are Stored",
      content: `Your memories are stored securely using Supermemory, a privacy-first memory system:

✓ Your data is yours: Only you can access your memories
✓ Automatic processing: No manual work needed - memories are created automatically
✓ Vector embeddings: Conversations are converted to mathematical representations (1536-dimensional vectors) that capture meaning, not just keywords
✓ Encrypted storage: All data is encrypted and stored securely
✓ Metadata enrichment: Tags, outcomes, and satisfaction scores are added automatically

When a conversation completes, we:
1. Extract the conversation text
2. Generate a semantic embedding (vector)
3. Auto-tag the conversation based on content
4. Detect if the issue was solved
5. Store everything in Supermemory for later retrieval`,
      icon: "🔐",
    },
    {
      id: "auto-tagging",
      title: "Auto-Tagging",
      content: `Every conversation is automatically tagged with relevant topics. These tags help organize and discover related conversations.

Common tags include:
• effect-ts: Issues related to Effect-TS framework
• error-handling: Error handling and exception management
• async: Asynchronous programming and concurrency
• typescript: TypeScript-specific questions
• performance: Performance optimization
• debugging: Debugging techniques
• architecture: System design and architecture
• refactoring: Code improvement and refactoring
• testing: Testing and quality assurance
• api-design: API design patterns
• data-structures: Data structures and algorithms
• deployment: Deployment and DevOps

Tags are added automatically based on keywords and context in your conversation. You can use tags to discover related conversations later.`,
      icon: "🏷️",
    },
    {
      id: "outcome-classification",
      title: "Outcome Classification",
      content: `Each conversation is classified by its outcome:

🎯 Solved: Your issue was fully resolved
   Example: "Perfect! That fixed my error handling problem."

⚠️ Unsolved: Your issue remains unresolved
   Example: "I'm still having trouble with this..."

🔄 Partial: Your issue was partially resolved
   Example: "That helps, but I still need clarification on..."

🔁 Revisited: You returned to a previously discussed topic
   Example: "I had this issue before, let me check the solution again..."

The system automatically detects these outcomes based on your responses. This helps prioritize solutions that worked before and identify patterns in your learning journey.`,
      icon: "📊",
    },
    {
      id: "semantic-search",
      title: "Semantic Search",
      content: `Semantic search finds conversations based on meaning, not just keywords.

How it works:
1. Your question is converted to a vector (semantic embedding)
2. The system finds conversations with similar semantic meaning
3. Results are ranked using a hybrid algorithm:
   • 60% Semantic similarity (meaning-based matching)
   • 30% Keyword relevance (exact phrase matching)
   • 7% Recency boost (recent conversations ranked higher)
   • 3% Satisfaction score (helpful conversations ranked higher)

Example:
Query: "How do I handle exceptions in Effect?"
Traditional search: Looks for the exact phrase "handle exceptions"
Semantic search: Finds conversations about error handling, try-catch patterns, recovery strategies, etc.

The semantic approach is much more powerful because it understands the context and meaning of your question, not just the words you used.`,
      icon: "🔍",
    },
    {
      id: "search-your-memories",
      title: "Search Your Memories",
      content: `You can search your memories in several ways:

1. Direct Search:
   Use the search feature to find past conversations
   Search uses semantic matching, so similar topics will be found even with different wording

2. Tag-Based Discovery:
   Browse conversations by tag to explore all discussions on a topic
   Great for discovering patterns in your learning journey

3. Outcome Filtering:
   Filter conversations by outcome (solved, unsolved, partial, revisited)
   Find solutions that worked before

4. Similarity Scoring:
   Each search result shows a similarity score (0-100%)
   Higher scores mean more relevant to your query

Tips for better search:
• Use natural language ("How do I handle errors?")
• Be specific about what you're looking for
• Search by topic if you remember tags
• Look at multiple results - variations might help`,
      icon: "🔎",
    },
    {
      id: "learning-journey",
      title: "Your Learning Journey",
      content: `Memories help visualize and accelerate your learning:

Pattern Recognition:
• See which topics you ask about frequently
• Identify areas where you struggle most
• Track progress over time

Knowledge Building:
• Each solved conversation builds on previous knowledge
• Revisited conversations show topics you return to
• Partial solutions lead to deeper understanding

Improvement Tracking:
• Track satisfaction scores over time
• See how your success rate improves
• Identify which assistant models work best for you

Acceleration:
• Get faster solutions by building on past conversations
• Avoid re-solving the same problems
• Develop expertise through review of your journey

Your complete conversation history becomes a personalized learning resource that grows with you.`,
      icon: "📈",
    },
    {
      id: "privacy-security",
      title: "Privacy & Security",
      content: `Your memories are private and secure:

Data Privacy:
✓ Only your memories - no sharing between users
✓ No access to other users' conversations
✓ Complete data isolation

Security Features:
✓ Encrypted storage at rest
✓ Encrypted in transit
✓ Access controlled by authentication
✓ No public sharing (unless you explicitly choose it)

Data Retention:
✓ Memories are retained for your access
✓ You can delete conversations anytime
✓ Deletion is permanent and immediate

Transparency:
✓ No hidden data collection beyond conversation content
✓ No selling or sharing of data
✓ No third-party access without consent

The system is designed with privacy-first principles. Your memories are truly yours.`,
      icon: "🛡️",
    },
    {
      id: "satisfaction-scoring",
      title: "Satisfaction Scoring",
      content: `Rate your conversations to help the system learn:

Why Rate Conversations:
• Helps identify which solutions work best
• Improves future recommendations
• Tracks your progress and satisfaction
• Enables more accurate ranking

Scoring:
⭐⭐⭐⭐⭐ (5) - Perfectly solved, very helpful
⭐⭐⭐⭐ (4) - Mostly helpful, minor issues
⭐⭐⭐ (3) - Somewhat helpful, needs improvement
⭐⭐ (2) - Minimal help
⭐ (1) - Not helpful

Impact:
• Highly-rated solutions appear higher in similar searches
• Low-rated solutions drop in ranking
• Helps identify your preferred explanation style

The system learns from your ratings to continuously improve its responses.`,
      icon: "⭐",
    },
    {
      id: "memory-limitations",
      title: "How Memories Work Best",
      content: `Memories are most effective when:

✓ Conversations are complete
  (Partial or very brief conversations may not capture full context)

✓ Clear questions are asked
  (Specific, well-formed questions lead to better semantic matching)

✓ Conversations have outcomes
  (Marking if an issue was solved helps with future searches)

✓ You provide feedback
  (Rating conversations helps the system improve)

Limitations to be aware of:
• Very new topics may not have past conversations
• Similar conversations might have different solutions
• Tags are automatic - sometimes imprecise
• Semantic search works best with 1-2 sentence queries
• Very large conversations are truncated to 5000 characters

For best results:
1. Have focused conversations on single topics
2. Rate conversations when complete
3. Use clear, descriptive language
4. Review multiple search results
5. Provide context in your questions`,
      icon: "⚡",
    },
    {
      id: "getting-started",
      title: "Getting Started",
      content: `Start using memories right away:

Today:
✓ Your conversations are automatically saved
✓ They're automatically tagged and analyzed
✓ You can search them anytime

Next Week:
✓ Look for patterns in your conversations
✓ Search for topics you've discussed before
✓ See how semantic search finds related conversations

This Month:
✓ Review your learning journey
✓ See which topics improved your satisfaction
✓ Use memories to accelerate learning on new topics

Next Quarter:
✓ Your memory library becomes a personalized knowledge base
✓ Quickly access solutions to recurring problems
✓ Track your expertise growth

Remember: Memories become more valuable the more you use them. The first conversation is just the beginning!`,
      icon: "🚀",
    },
    {
      id: "best-practices",
      title: "Best Practices",
      content: `Maximize the value of your memories:

Before Searching:
□ Be specific: "How do I handle async errors in Effect?" vs "async"
□ Use natural language: Type like you're asking a friend
□ Include context: "I'm building a React component and..."
□ Mention constraints: "...and it needs to be fast"

When Searching:
□ Try multiple queries: Different wording might find different results
□ Use tags: If you remember the topic, search by tag
□ Check the similarity score: Higher scores are usually more relevant
□ Review multiple results: The second result might be perfect

After Finding a Solution:
□ Rate the conversation: Help the system learn
□ Mark if solved: Indicates the outcome
□ Note the tags: Remember them for future searches
□ Save the chat: Create a bookmark if needed

Organizing Your Memories:
□ Use clear conversation openers: Helps with later search
□ Ask one topic per conversation: Cleaner memories
□ Provide outcomes: Say if it solved your issue
□ Rate helpfulness: 3-5 minutes well spent

Long-Term:
□ Periodically review your memory library
□ Look for patterns in your questions
□ Track topics where you've improved
□ Share helpful conversations with team members (if public)`,
      icon: "✅",
    },
  ],
};

export type MemoriesGuideSection = (typeof memoriesGuide.sections)[number];

export function getMemoriesSectionById(id: string): MemoriesGuideSection | undefined {
  return memoriesGuide.sections.find((section) => section.id === id);
}

export function getAllMemoriesSections(): MemoriesGuideSection[] {
  return memoriesGuide.sections;
}

export const memoriesQuickTips = [
  {
    title: "Semantic Search",
    description:
      "Search finds conversations by meaning, not just keywords. Ask questions naturally!",
  },
  {
    title: "Auto-Tags",
    description:
      "Conversations are automatically tagged with topics. Use tags to discover related discussions.",
  },
  {
    title: "Outcome Tracking",
    description:
      "Mark if issues are solved, partial, or unsolved. This helps find solutions that work!",
  },
  {
    title: "Satisfaction Scores",
    description:
      "Rate conversations to improve future recommendations. Helpful ratings appear higher in searches.",
  },
  {
    title: "Learning Journey",
    description:
      "Your memories become a personalized knowledge base. Track your progress and growth over time.",
  },
  {
    title: "Privacy First",
    description: "Your memories are encrypted and private. Only you can access your data.",
  },
];
