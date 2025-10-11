# Release Checklist

Complete checklist for preparing and announcing the Effect Patterns Hub CLI release.

## Pre-Release

### Code Quality

- [x] All tests passing (73/73 tests)
- [x] No lint errors
- [x] TypeScript compilation successful
- [x] All examples execute correctly

### Documentation

- [x] README.md updated with CLI section
- [x] SETUP.md complete and accurate
- [x] TESTING.md comprehensive
- [x] CHANGELOG-CLI.md up to date
- [x] ROADMAP.md reflects current state
- [x] All command help text accurate
- [x] Code comments up to date

### Testing

- [x] Unit tests passing
- [x] Integration tests passing
- [x] CLI commands tested manually
- [x] Pattern Server integration verified
- [x] Error handling tested
- [x] Edge cases covered

### Package Configuration

- [ ] package.json version correct
- [ ] package.json bin entry correct
- [ ] package.json scripts working
- [ ] Dependencies up to date
- [ ] DevDependencies appropriate
- [ ] License file present

## Release Process

### Version Management

- [ ] Determine version number (current: 0.3.1)
- [ ] Follow semantic versioning
- [ ] Update package.json version
- [ ] Update CHANGELOG-CLI.md with release notes
- [ ] Tag release in git

### Git Operations

- [ ] All changes committed
- [ ] Working directory clean
- [ ] Branch up to date with main
- [ ] Create release tag
- [ ] Push commits
- [ ] Push tags

### GitHub Release
- [ ] Create GitHub release
- [ ] Use version tag (e.g., v0.4.0)
- [ ] Copy release notes from CHANGELOG-CLI.md
- [ ] Include installation instructions
- [ ] Add link to documentation
- [ ] Mark as latest release

## Post-Release

### Verification
- [ ] Clone fresh repository
- [ ] Run `bun install`
- [ ] Run `bun link`
- [ ] Verify `ep --help` works
- [ ] Test `ep install add --tool cursor`
- [ ] Verify all commands functional

### Post-Release Documentation

### Post-Release Steps

- [ ] Update GitHub README if needed
- [ ] Update documentation if needed
- [ ] Double check all links work

### Announcement

- [ ] Post release announcement
- [ ] Share on social media
- [ ] Update Discord

### Monitoring

- [ ] Monitor GitHub issues for bug reports
- [ ] Check for installation problems
- [ ] Respond to questions
- [ ] Track usage metrics (if available)

## Release Commands

### Using the CLI

```bash
# Preview the next release
ep admin release preview

# Create the release (automated)
ep admin release create
```

### Manual Release

If you need to create a release manually:

```bash
# 1. Update version in package.json
# Edit package.json manually

# 2. Update CHANGELOG-CLI.md
# Add release notes manually

# 3. Commit changes
git add package.json CHANGELOG-CLI.md
git commit -m "chore: release v0.4.0"

# 4. Create tag
git tag -a v0.4.0 -m "Release v0.4.0"

# 5. Push
git push origin main
git push origin v0.4.0

# 6. Create GitHub release
# Use GitHub web interface or gh CLI
```

## Version Numbering Guide

Follow [Semantic Versioning](https://semver.org/):

- **Major (x.0.0)**: Breaking changes
  - Command structure changes
  - Removed features
  - Incompatible API changes

- **Minor (0.x.0)**: New features
  - New commands
  - New options
  - New supported tools
  - Backward-compatible additions

- **Patch (0.0.x)**: Bug fixes
  - Bug fixes
  - Documentation updates
  - Performance improvements
  - No new features

## Conventional Commits

Use conventional commit format for automatic versioning:

```bash
# Patch version bump
fix: correct typo in help text
docs: update installation instructions

# Minor version bump
feat: add support for new AI tool
feat: add interactive rule selection

# Major version bump
feat!: change command structure
BREAKING CHANGE: renamed 'rules' command to 'install'
```

## Rollback Plan

If issues are discovered after release:

1. **Document the issue**
   - Create GitHub issue
   - Note affected versions
   - Describe the problem

2. **Quick fix if possible**
   - Create hotfix branch
   - Fix the issue
   - Test thoroughly
   - Release patch version

3. **Revert if necessary**
   - Revert problematic commits
   - Create new release
   - Update documentation
   - Notify users

## Communication Templates

### GitHub Release Template

```markdown
## 🎉 Release v0.4.0

### ✨ New Features
- Feature 1
- Feature 2

### 🐛 Bug Fixes
- Fix 1
- Fix 2

### 📚 Documentation
- Documentation update 1
- Documentation update 2

### 🔧 Improvements
- Improvement 1
- Improvement 2

### Installation

\`\`\`bash
git clone https://github.com/patrady/effect-patterns.git
cd effect-patterns
bun install
bun link
\`\`\`

### Documentation

- [SETUP.md](./SETUP.md) - Setup guide
- [TESTING.md](./TESTING.md) - Testing guide
- [CHANGELOG-CLI.md](./CHANGELOG-CLI.md) - Full changelog

### Feedback

Please report issues at: https://github.com/patrady/effect-patterns/issues
```

### Social Media Template

```text
🎉 Announcing Effect Patterns Hub CLI v0.4.0!

✨ Install Effect-TS coding rules into 10 AI tools
🎯 Smart filtering by skill level & use case
📦 Pattern management & validation
🚀 Automated release management

Get started: [https://github.com/patrady/effect-patterns](https://github.com/patrady/effect-patterns)

\#EffectTS \#TypeScript \#CLI \#AI
```

## Support Channels

After release, monitor:

- GitHub Issues
- GitHub Discussions
- Pull Requests
- Social media mentions

Respond to:

- Bug reports within 24 hours
- Feature requests within 48 hours
- Questions within 24 hours
- Pull requests within 72 hours

## Success Metrics

Track these metrics post-release:

- GitHub stars
- Forks
- Clone count
- Issue reports
- Pull requests
- Community engagement

## Notes

- Keep this checklist updated with lessons learned
- Add new items as needed
- Remove obsolete items
- Share feedback with team
