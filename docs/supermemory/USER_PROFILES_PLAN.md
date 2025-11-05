# User Profiles CLI Implementation Plan

## Overview

Implement comprehensive user profile management commands in SM-CLI to leverage Supermemory's automatic user profiling system. User profiles provide persistent, holistic context about users divided into:

- **Static Profile**: Long-term, stable facts (role, expertise, preferences)
- **Dynamic Profile**: Recent context and temporary information (current projects, activities)

## API Reference

**Endpoint**: `POST /v4/profile`

**Parameters**:
- `containerTag` (string, required) - User ID or container tag
- `q` (string, optional) - Search query to combine with profile

**Response**:
```json
{
  "profile": {
    "static": ["fact1", "fact2", ...],
    "dynamic": ["context1", "context2", ...]
  },
  "searchResults": {
    "results": [...],
    "total": N,
    "timing": ms
  }
}
```

## Planned Commands

### 1. profiles show
Show user profile for a specific user or container tag.

**Usage**:
```bash
bun run sm-cli profiles show --user user_123
bun run sm-cli profiles show --user user_123 --format json
bun run sm-cli profiles show --user user_123 --section static
bun run sm-cli profiles show --user user_123 --section dynamic
```

**Options**:
- `--user` (text, required) - User ID or container tag
- `--section` (static | dynamic | both) - Which profile section to show (default: both)
- `--format` (human | json) - Output format (default: human)

**Output**:
- Formatted display of static and dynamic profile facts
- JSON export option for integration
- Section filtering to focus on specific profile parts

### 2. profiles search
Get user profile combined with search results.

**Usage**:
```bash
bun run sm-cli profiles search --user user_123 --query "deployment errors"
bun run sm-cli profiles search --user user_123 --query "current projects" --format json
```

**Options**:
- `--user` (text, required) - User ID or container tag
- `--query` (text, required) - Search query to combine with profile
- `--format` (human | json) - Output format (default: human)

**Output**:
- User profile (static + dynamic)
- Search results matching the query
- Combined context for LLM usage

### 3. profiles export
Export user profile data for use in system prompts or external systems.

**Usage**:
```bash
bun run sm-cli profiles export --user user_123 --output profile.json
bun run sm-cli profiles export --user user_123 --format prompt
```

**Options**:
- `--user` (text, required) - User ID or container tag
- `--output` (text, optional) - Output file path (default: stdout)
- `--format` (json | prompt | text) - Export format (default: json)
  - `json` - JSON structure
  - `prompt` - Formatted for system prompt injection
  - `text` - Plain text with sections

**Output**:
- Save to file or display formatted output
- System prompt format for easy LLM integration

### 4. profiles list
List profiles for multiple users or a user segment.

**Usage**:
```bash
bun run sm-cli profiles list --container default
bun run sm-cli profiles list --container project_alpha --limit 10
```

**Options**:
- `--container` (text, required) - Container tag to query
- `--limit` (integer) - Maximum profiles to show (default: 20)
- `--format` (human | json) - Output format (default: human)

**Output**:
- Summary table of users and their profile sizes
- Count of static and dynamic facts per user
- JSON export for analysis

### 5. profiles compare
Compare profiles between two users to identify similarities/differences.

**Usage**:
```bash
bun run sm-cli profiles compare --user1 user_123 --user2 user_456
bun run sm-cli profiles compare --user1 user_123 --user2 user_456 --show differences
```

**Options**:
- `--user1` (text, required) - First user ID
- `--user2` (text, required) - Second user ID
- `--show` (all | similarities | differences) - What to compare (default: all)
- `--format` (human | json) - Output format (default: human)

**Output**:
- Venn diagram-style display of common vs unique facts
- Side-by-side profile comparison
- Differences highlighted

### 6. profiles stats
Show statistics about user profiles in a container.

**Usage**:
```bash
bun run sm-cli profiles stats --container default
bun run sm-cli profiles stats --container project_alpha --format json
```

**Options**:
- `--container` (text, required) - Container tag to analyze
- `--format` (human | json) - Output format (default: human)

**Output**:
- Total users with profiles
- Average static/dynamic facts per user
- Most common profile topics
- Distribution statistics

## Type Definitions

### UserProfile
```typescript
interface UserProfile {
  userId: string;
  static: string[];      // Long-term stable facts
  dynamic: string[];     // Recent context & temporary info
  retrievedAt: string;   // Timestamp of profile retrieval
}
```

### UserProfileWithSearch
```typescript
interface UserProfileWithSearch {
  profile: UserProfile;
  searchResults?: SearchResult[];
  searchQuery?: string;
  searchTiming?: number;
}
```

### ProfileComparison
```typescript
interface ProfileComparison {
  user1: string;
  user2: string;
  commonStatic: string[];
  uniqueStatic1: string[];
  uniqueStatic2: string[];
  commonDynamic: string[];
  uniqueDynamic1: string[];
  uniqueDynamic2: string[];
}
```

### ProfileStats
```typescript
interface ProfileStats {
  container: string;
  totalUsers: number;
  avgStaticFacts: number;
  avgDynamicFacts: number;
  maxStaticFacts: number;
  maxDynamicFacts: number;
  commonTopics: Record<string, number>;
  retrievedAt: string;
}
```

## Service Methods

### SupermemoryService Extensions

```typescript
// Get user profile (static + dynamic)
getUserProfile(userId: string): Effect.Effect<UserProfile, SupermemoryError>

// Get profile with search results
getUserProfileWithSearch(
  userId: string,
  query: string
): Effect.Effect<UserProfileWithSearch, SupermemoryError>

// Compare two user profiles
compareUserProfiles(
  user1Id: string,
  user2Id: string
): Effect.Effect<ProfileComparison, SupermemoryError>

// Get profile statistics for container
getProfileStats(
  containerTag: string
): Effect.Effect<ProfileStats, SupermemoryError>
```

## Implementation Details

### Service Layer (supermemory.ts)
- Add 4 new service methods for profile operations
- Use Supermemory API `/v4/profile` endpoint
- Handle error cases (404, authorization, etc.)
- Type-safe request/response handling

### Commands Layer (profiles.ts)
- 6 new subcommands with full option parsing
- Beautiful colored output with tables and formatting
- Interactive mode for selecting users (future enhancement)
- Profile section filtering and display
- Side-by-side comparison views
- System prompt format export

### Types Layer (types.ts)
- Add 4 new interface definitions
- Extend existing user types as needed
- Full type safety for profile operations

## UI/UX Features

### Output Formatting
- **Static Facts Section**: Displayed with icon 📋 in one color
- **Dynamic Context Section**: Displayed with icon 🔄 in another color
- **Search Results**: Integrated below profile with icon 🔍
- **Comparison View**: Venn diagram-style display
- **Statistics**: Charts and distribution metrics

### Status Indicators
- 📋 Static profile (stable information)
- 🔄 Dynamic profile (recent context)
- 🔍 Search results
- 👥 User comparison
- 📊 Statistics

### Export Formats

**JSON Format**:
```json
{
  "userId": "user_123",
  "static": [...],
  "dynamic": [...],
  "retrievedAt": "2025-11-04T..."
}
```

**Prompt Format**:
```
ABOUT THE USER:
- Fact 1
- Fact 2
...

CURRENT CONTEXT:
- Context 1
- Context 2
...
```

**Text Format**:
```
User Profile for user_123
Retrieved: 2025-11-04T...

STATIC PROFILE (Stable Facts):
- Fact 1
- Fact 2
...

DYNAMIC PROFILE (Recent Context):
- Context 1
- Context 2
...
```

## Integration with Existing Commands

User profiles work alongside existing memory commands:

```bash
# Create memories for a user
bun run sm-cli memories add

# View user profile built from their memories
bun run sm-cli profiles show --user user_123

# Search profile with specific query
bun run sm-cli profiles search --user user_123 --query "expertise"

# Export for LLM integration
bun run sm-cli profiles export --user user_123 --format prompt
```

## Testing Strategy

### Unit Tests
- Profile retrieval with valid user ID
- Profile retrieval with invalid user ID (404)
- Profile with search results
- Profile comparison logic
- Statistics calculation
- Error handling

### Integration Tests
- Full workflow: create memories → build profile → query profile
- Multiple users in same container
- Profile updates over time
- Large profile handling
- Export formats validation

### Manual Testing
- Interactive command testing
- Format output verification
- Error message clarity
- Performance with large profiles

## Performance Considerations

| Operation | Typical Time | Notes |
|-----------|-------------|-------|
| Get profile | 50-100ms | Single API call |
| Profile + search | 100-200ms | Parallel or sequential |
| Compare profiles | 150-300ms | 2 profile calls + comparison |
| Container stats | 200-500ms | May require multiple calls |

## Security Considerations

1. **User ID Validation**: Validate container tags before API calls
2. **Data Privacy**: Profiles contain personal information - handle securely
3. **Rate Limiting**: Batch operations may hit rate limits
4. **Export Permissions**: Verify user has permission to export profiles

## Files to Create/Modify

### New Files
- `app/sm-cli/src/commands/profiles.ts` - Profile commands (estimated 400+ lines)
- `app/sm-cli/PROFILES_GUIDE.md` - User documentation (estimated 300+ lines)

### Modified Files
- `app/sm-cli/src/types.ts` - Add profile interfaces
- `app/sm-cli/src/services/supermemory.ts` - Add profile service methods
- `app/sm-cli/src/index.ts` - Register profiles command group

## Timeline

1. **Design** (Current) - Complete type and architecture design
2. **Implementation** - Add types, service methods, commands
3. **Testing** - Interactive testing of all commands
4. **Documentation** - User guide and examples
5. **Commit & PR** - Submit for review

## Success Criteria

✅ All 6 profile commands working
✅ Beautiful, informative output
✅ Full JSON export support
✅ Comprehensive error handling
✅ Complete documentation
✅ All commands tested interactively
✅ Production-ready code

## Future Enhancements

- Profile diff/history tracking
- Profile merge for duplicate users
- Batch profile operations
- Real-time profile monitoring
- Profile webhook notifications
- Custom profile fields
- Profile permissions/sharing
