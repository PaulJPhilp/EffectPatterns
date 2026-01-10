---
"@effect-patterns/ep-cli": minor
---

Feature: Rule Management Commands
- Added `ep install remove <rule-id>` to remove installed rules.
- Added `ep install list --installed` to view installed rules.
- Added `ep install diff <rule-id>` to compare installed rules with the latest version.
- Implemented local state persistence via `.ep-installed.json` to track rule installations.
