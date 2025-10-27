# Session Service

Manages user session state with Convex real-time sync.

## Status

🚧 **Phase 3 Implementation** - Service scaffold created, implementation pending.

## Purpose

- Manage user session state
- Sync with Convex for real-time updates
- Track current learning context (module, pattern, phase)
- Manage subscription tier

## API

### `getSession(userId): Effect<Session, SessionNotFoundError>`

Get user session by ID.

### `updateSession(session): Effect<void, SessionUpdateError>`

Update user session.

## Dependencies

- `ConvexAdapter` - Convex client for real-time state

## TODO

- [ ] Implement Convex adapter
- [ ] Add real-time subscription support
- [ ] Implement session caching
- [ ] Add tests
