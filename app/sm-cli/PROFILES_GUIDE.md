# Supermemory User Profiles Guide

User profiles are automatically generated profiles that combine all memories and context for a specific user. The SM-CLI provides comprehensive commands to view, search, compare, and export these profiles.

## What are User Profiles?

Supermemory automatically builds user profiles from the memories and interactions stored in your system. Each profile contains:

- **Static Profile**: Long-term, stable facts about the user (expertise, role, preferences, interests)
- **Dynamic Profile**: Recent context and temporary information (current projects, recent activities, current focus)

These profiles are built automatically from the memories you create and are perfect for:
- Getting holistic context about a user
- Personalizing responses and interactions
- Understanding user patterns and preferences
- Comparing users and finding common interests

## API Reference

Profiles are accessed via the Supermemory `/v4/profile` API endpoint:

```
POST /v4/profile
{
  "containerTag": "user_id",
  "q": "optional search query"
}
```

Response:
```json
{
  "profile": {
    "static": ["fact1", "fact2", ...],
    "dynamic": ["context1", "context2", ...]
  },
  "searchResults": {
    "results": [...],
    "timing": 123
  }
}
```

## Commands

### profiles show

Display a user's profile with static and dynamic facts.

**Usage:**
```bash
bun run sm-cli profiles show --user user_123
bun run sm-cli profiles show --user user_123 --section static
bun run sm-cli profiles show --user user_123 --section dynamic
bun run sm-cli profiles show --user user_123 --format json
```

**Options:**
- `--user` (required) - User ID or container tag
- `--section` (optional) - Show section: `static`, `dynamic`, or `both` (default: both)
- `--format` (optional) - Output format: `human` or `json` (default: human)

**Example:**
```bash
$ bun run sm-cli profiles show --user alice_123

╔══════════════════════════════════════════════════════════════════╗
║ User Profile: alice_123                                          ║
║ Retrieved: 11/4/2025, 4:45 PM                                    ║
╚══════════════════════════════════════════════════════════════════╝

┌──────────────────┬───────────────────────────────────────────────┐
│ Section          │ Facts                                         │
├──────────────────┼───────────────────────────────────────────────┤
│ 📋 Static Profile │   • Senior developer with 10 years experience│
│                  │   • Expertise in Effect-TS and functional    │
│                  │   • Leads a team of 5 engineers             │
├──────────────────┼───────────────────────────────────────────────┤
│ 🔄 Dynamic       │   • Currently working on auth system        │
│ Profile          │   • Interested in performance optimization   │
│                  │   • Recently reviewed 12 PRs                │
└──────────────────┴───────────────────────────────────────────────┘
```

### profiles search

Get a user's profile combined with search results for a specific query.

**Usage:**
```bash
bun run sm-cli profiles search --user user_123 --query "authentication"
bun run sm-cli profiles search --user user_123 --query "current projects" --format json
```

**Options:**
- `--user` (required) - User ID or container tag
- `--query` (required) - Search query to combine with profile
- `--format` (optional) - Output format: `human` or `json` (default: human)

**Example:**
```bash
$ bun run sm-cli profiles search --user alice_123 --query "deployment"

╔══════════════════════════════════════════════════════════════════╗
║ Profile Search: alice_123                                        ║
║ Query: "deployment"                                              ║
║ Retrieved: 11/4/2025, 4:46 PM                                    ║
╚══════════════════════════════════════════════════════════════════╝

┌──────────────────┬───────────────────────────────────────────────┐
│ Profile          │ Content                                       │
├──────────────────┼───────────────────────────────────────────────┤
│ 📋 Static        │   • Expert in deployment strategies           │
│                  │   • Led multiple microservice migrations      │
├──────────────────┼───────────────────────────────────────────────┤
│ 🔄 Dynamic       │   • Currently implementing CI/CD pipeline     │
│                  │   • Optimizing deployment time                │
└──────────────────┴───────────────────────────────────────────────┘

🔍 Search Results

┌────────────┬──────────────────────────────────────────────────────┐
│ Score      │ Content                                              │
├────────────┼──────────────────────────────────────────────────────┤
│ 0.95       │ Deployment automation reduces manual steps by 80%    │
│ 0.91       │ Blue-green deployment strategy for zero-downtime     │
│ 0.88       │ Container orchestration with Kubernetes             │
│ 0.84       │ Infrastructure as Code best practices               │
│ 0.79       │ Monitoring and alerting for deployments             │
└────────────┴──────────────────────────────────────────────────────┘

Timing: 145ms
```

### profiles export

Export a user's profile to a file in various formats.

**Usage:**
```bash
bun run sm-cli profiles export --user user_123 --output profile.json
bun run sm-cli profiles export --user user_123 --format prompt
bun run sm-cli profiles export --user user_123 --format text --output profile.txt
```

**Options:**
- `--user` (required) - User ID or container tag
- `--format` (optional) - Export format: `json`, `prompt`, or `text` (default: json)
- `--output` (optional) - Output file path (default: stdout)

**Formats:**

**JSON Format** (for programmatic use):
```json
{
  "userId": "user_123",
  "static": ["Senior developer", "Effect-TS expert"],
  "dynamic": ["Working on auth", "Reviewing PRs"],
  "retrievedAt": "2025-11-04T16:46:00Z"
}
```

**Prompt Format** (for LLM integration):
```
ABOUT THE USER:
User ID: user_123

Stable Facts:
- Senior developer with 10 years experience
- Expertise in Effect-TS and functional programming
- Leads a team of 5 engineers

CURRENT CONTEXT:
- Currently working on auth system
- Interested in performance optimization
- Recently reviewed 12 PRs

Retrieved: 2025-11-04T16:46:00Z
```

**Text Format** (human readable):
```
User Profile: user_123
Retrieved: 11/4/2025, 4:46 PM
============================================================

STATIC PROFILE (Stable Facts):
────────────────────────────────────────────────────────────
• Senior developer with 10 years experience
• Expertise in Effect-TS and functional programming
• Leads a team of 5 engineers

DYNAMIC PROFILE (Recent Context):
────────────────────────────────────────────────────────────
• Currently working on auth system
• Interested in performance optimization
• Recently reviewed 12 PRs
```

### profiles list

List profiles in a container with statistics.

**Usage:**
```bash
bun run sm-cli profiles list --container default
bun run sm-cli profiles list --container project_alpha --limit 50
bun run sm-cli profiles list --container default --format json
```

**Options:**
- `--container` (required) - Container tag to query
- `--limit` (optional) - Maximum profiles to show (default: 20)
- `--format` (optional) - Output format: `human` or `json` (default: human)

**Example:**
```bash
$ bun run sm-cli profiles list --container project_alpha

╔══════════════════════════════════════════════════════════════════╗
║ Container Profiles: project_alpha                               ║
║ Retrieved: 11/4/2025, 4:47 PM                                    ║
╚══════════════════════════════════════════════════════════════════╝

┌────────────────────────┬────────────────────────────────────────┐
│ Metric                 │ Value                                  │
├────────────────────────┼────────────────────────────────────────┤
│ Total Users            │ 28                                     │
│ Average Static Facts   │ 4.2                                    │
│ Average Dynamic Facts  │ 3.7                                    │
│ Max Static Facts       │ 12                                     │
│ Max Dynamic Facts      │ 9                                      │
└────────────────────────┴────────────────────────────────────────┘

📊 Common Topics

┌────────────────────────────────┬──────────────┐
│ Topic                          │ Count        │
├────────────────────────────────┼──────────────┤
│ Effect-TS patterns             │ 18 ████████ │
│ API design                     │ 15 ███████  │
│ Performance optimization       │ 13 ██████   │
│ Testing strategies             │ 11 █████    │
│ Database optimization          │ 9  ████     │
└────────────────────────────────┴──────────────┘
```

### profiles compare

Compare profiles between two users.

**Usage:**
```bash
bun run sm-cli profiles compare --user1 user_123 --user2 user_456
bun run sm-cli profiles compare --user1 alice --user2 bob --show differences
bun run sm-cli profiles compare --user1 alice --user2 bob --format json
```

**Options:**
- `--user1` (required) - First user ID
- `--user2` (required) - Second user ID
- `--show` (optional) - What to compare: `all`, `similarities`, `differences` (default: all)
- `--format` (optional) - Output format: `human` or `json` (default: human)

**Example:**
```bash
$ bun run sm-cli profiles compare --user1 alice --user2 bob

╔══════════════════════════════════════════════════════════════════╗
║ Profile Comparison: alice vs bob                                ║
╚══════════════════════════════════════════════════════════════════╝

┌──────────────────────────┬──────────┬──────────┐
│ Category                 │ alice    │ bob      │
├──────────────────────────┼──────────┼──────────┤
│ Common Static Facts      │ 5        │ 5        │
│ Common Dynamic Facts     │ 2        │ 2        │
│ Unique Static Facts      │ 3        │ 4        │
│ Unique Dynamic Facts     │ 1        │ 3        │
└──────────────────────────┴──────────┴──────────┘

Common Static Facts

  • Effect-TS expertise
  • Team leadership experience
  • Performance optimization focus
  • Testing advocate
  • API design experience

Unique to alice (Static)

  • PhD in Computer Science
  • Published 3 research papers
  • Conference speaker

Unique to bob (Static)

  • Open source maintainer
  • DevOps specialist
  • Infrastructure automation expert
  • Kubernetes certified
```

### profiles stats

Show detailed statistics about profiles in a container.

**Usage:**
```bash
bun run sm-cli profiles stats --container default
bun run sm-cli profiles stats --container project_alpha --format json
```

**Options:**
- `--container` (required) - Container tag to analyze
- `--format` (optional) - Output format: `human` or `json` (default: human)

**Example:**
```bash
$ bun run sm-cli profiles stats --container default

╔══════════════════════════════════════════════════════════════════╗
║ Profile Statistics: default                                      ║
║ Retrieved: 11/4/2025, 4:48 PM                                    ║
╚══════════════════════════════════════════════════════════════════╝

┌────────────────────────────────┬────────────────────────────────┐
│ Metric                         │ Value                          │
├────────────────────────────────┼────────────────────────────────┤
│ Total Users                    │ 156                            │
│ Avg Static Facts per User      │ 4.3                            │
│ Avg Dynamic Facts per User     │ 3.8                            │
│ Max Static Facts               │ 18                             │
│ Max Dynamic Facts              │ 14                             │
└────────────────────────────────┴────────────────────────────────┘

📊 Top 10 Common Topics

┌──────────────────────────────┬─────────────────────────┐
│ Topic                        │ Frequency               │
├──────────────────────────────┼─────────────────────────┤
│ Effect-TS patterns           │ 132 ██████████████████ │
│ Error handling               │ 98  ███████████████    │
│ API design                   │ 87  ████████████████   │
│ Performance optimization     │ 76  ███████████        │
│ Testing strategies           │ 71  ██████████         │
│ Functional programming       │ 65  █████████          │
│ Type safety                  │ 58  ████████           │
│ Concurrency patterns         │ 52  ███████            │
│ Data transformation          │ 48  ███████            │
│ Schema validation            │ 42  ██████             │
└──────────────────────────────┴─────────────────────────┘
```

## Common Workflows

### Get User Context for LLM Integration

```bash
# Export user profile in prompt format for system prompt
bun run sm-cli profiles export --user user_123 --format prompt

# Use in your system prompt:
# "You are helping ${USER_NAME}. Here's their background:
# $(sm-cli profiles export --user user_123 --format prompt)"
```

### Understand User Expertise

```bash
# Show only static profile (expertise, skills, interests)
bun run sm-cli profiles show --user alice_123 --section static
```

### Track User Activity

```bash
# Show only dynamic profile (current projects, recent activity)
bun run sm-cli profiles show --user alice_123 --section dynamic
```

### Find Similar Users

```bash
# Compare two users to find common interests
bun run sm-cli profiles compare --user1 alice --user2 bob --show similarities

# This helps with team assignments, mentoring, and collaboration
```

### Analyze Team Composition

```bash
# Get team statistics
bun run sm-cli profiles stats --container team_backend

# Compare expertise distribution across team
bun run sm-cli profiles list --container team_backend --limit 100
```

### Search Within User Context

```bash
# Find what a user knows about a specific topic
bun run sm-cli profiles search --user alice_123 --query "kubernetes"

# Combines their profile with related memories
```

## Output Formats

All commands support flexible output:

- **human** (default) - Beautiful formatted output with colors and tables
- **json** - Structured JSON for programmatic use

Use JSON for:
- Scripting and automation
- Integration with other tools
- Data analysis and reporting
- Piping to other commands

Example:
```bash
# Export all profiles from a container as JSON
bun run sm-cli profiles list --container default --format json | jq '.commonTopics'

# Get top expertise areas
bun run sm-cli profiles stats --container default --format json | jq '.commonTopics | to_entries | sort_by(-.value) | .[0:5]'
```

## Error Handling

### User Not Found

```
SupermemoryError: Failed to get user profile: Error: Failed to fetch user profile: 404
```

Solution: Verify the user ID is correct and the user has at least one memory in Supermemory.

### No Profile Data

```
SupermemoryError: No profile data returned for user user_123
```

Solution: The user may be new or have no memories yet. Create some memories first.

### API Timeout

```
SupermemoryError: Failed to get profile stats: Error: Failed to fetch profile stats: 504
```

Solution: The Supermemory API may be temporarily unavailable. Try again in a few seconds.

### Invalid Container

```
SupermemoryError: No profile data returned for user container_tag
```

Solution: Verify the container tag exists. Use a valid Supermemory container.

## Performance Tips

1. **Use JSON format for scripting** - Reduces overhead compared to parsing human-readable output
2. **Limit results** - When listing profiles, set an appropriate `--limit` to reduce data transfer
3. **Cache profiles** - Profile data doesn't change frequently; consider caching if calling repeatedly
4. **Use specific sections** - When you only need static or dynamic data, filter with `--section`
5. **Batch comparisons** - If comparing many users, collect and process in batches

## Integration with Other Commands

Profiles work alongside other SM-CLI commands:

```bash
# Create memories for a user
bun run sm-cli memories add

# View the memories
bun run sm-cli memories list

# See user profile built from memories
bun run sm-cli profiles show --user user_123

# Search profile for specific topics
bun run sm-cli profiles search --user user_123 --query "expertise"

# Export for LLM integration
bun run sm-cli profiles export --user user_123 --format prompt
```

## Use Cases

### Customer Support
```bash
# Before helping a customer, review their profile
bun run sm-cli profiles show --user customer_id
bun run sm-cli profiles search --user customer_id --query "previous issues"
```

### Team Collaboration
```bash
# Find an expert to help with a task
bun run sm-cli profiles search --user team_member --query "kubernetes"

# Compare team members' expertise
bun run sm-cli profiles compare --user1 alice --user2 bob
```

### Personal Knowledge Management
```bash
# Export your profile to understand your own growth
bun run sm-cli profiles show --user my_user_id --format json

# Track how your skills evolve over time
bun run sm-cli profiles export --user my_user_id --format text --output profile-snapshot.txt
```

### AI Assistant Training
```bash
# Get user context for personalized responses
PROFILE=$(bun run sm-cli profiles export --user user_123 --format prompt)

# Include in system prompt for AI models
anthropic_api_call \
  --system "User context: $PROFILE" \
  --user-message "Help me with X"
```

## API Details

### Endpoint
```
POST /v4/profile
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### Request
```json
{
  "containerTag": "user_123",
  "q": "optional search query"
}
```

### Response
```json
{
  "profile": {
    "static": [
      "Senior developer with 10 years experience",
      "Effect-TS expert"
    ],
    "dynamic": [
      "Currently working on auth system",
      "Interested in performance"
    ]
  },
  "searchResults": {
    "results": [
      {
        "id": "memory_123",
        "content": "Deployment automation...",
        "score": 0.95,
        "metadata": {}
      }
    ],
    "timing": 145
  }
}
```

## Next Steps

- Explore user profiles with `profiles show`
- Compare team expertise with `profiles compare`
- Export profiles for AI integration with `profiles export`
- Analyze team composition with `profiles stats`
- Search for specific skills with `profiles search`

For more information about Supermemory, visit https://supermemory.ai/docs/
