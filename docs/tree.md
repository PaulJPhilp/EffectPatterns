```markdown
[Oct 10 2025]  docs/ (proposed reorganization)

Overview: to improve discoverability we'll group documents into focused subfolders
while preserving the original files. The reorg is staged using lightweight
placeholder files that reference authoritative originals until a full migration
is approved.

docs/
├── guides/
│   ├── CONTRIBUTING.md                # Contributor guide (placeholder)
│   ├── DEPLOYMENT.md                  # Deployment guide (placeholder)
│   └── patterns-guide.md              # Patterns guide (placeholder)
├── reference/
│   └── CHANGELOG.md                   # Changelog (placeholder)
├── implementation/
│   └── STEP_1_SERVER_BOILERPLATE.md   # Server boilerplate (placeholder)
├── release/
│   └── EFFECT_LINTER_RULES.md         # Linter rules (placeholder)
├── claude-plugin/                     # Plugin docs (kept together)
├── archive/                           # Historical artifacts (unchanged)
├── IdiomaticEffect.mdx                # Remains at top-level (MDX guide)
├── SERVER_IMPLEMENTATION_COMPLETE.md  # Implementation summary
├── SERVICE_PATTERNS.md                # Service patterns reference
├── STEP_2_RULES_ENDPOINT.md           # Endpoint implementation guide
└── tree.md                            # This file

Notes:
- Placeholders in the new folders point to the existing top-level files so
  links and references remain valid during the staged reorg.
- Next steps: finalize the moves by replacing placeholders with the full
  documents and updating internal links. See the todo list for remaining steps.

``` [Oct  9 23:32]  .
├── [Oct  5 22:03]  archive
│   ├── [Sep 30 17:13]  CURRENT_STATUS.md
│   ├── [Sep 30 17:38]  DISCORD_ANNOUNCEMENT.md
│   ├── [Sep 30 17:13]  EFFECT_MDX_CHANGES.md
│   ├── [Sep 30 17:13]  EFFECT_MDX_FIX.md
│   ├── [Sep 30 17:13]  ENHANCED_QA_GUIDE.md
│   ├── [Sep 30 17:13]  FOLDER_RESTRUCTURE_SUMMARY.md
│   ├── [Sep 30 17:13]  INGEST_PIPELINE_DESIGN.md
│   ├── [Sep 30 17:13]  INGEST_PIPELINE_SUMMARY.md
│   ├── [Sep 30 17:13]  INGEST_QA_INTEGRATION.md
│   ├── [Sep 30 17:13]  INGEST_READY.md
│   ├── [Sep 30 17:13]  INTEGRATION_TESTING_GUIDE.md
│   ├── [Sep 30 17:15]  MERGE_COMPLETE.md
│   ├── [Sep 30 17:13]  PIPELINE_COMPLETE_SUMMARY.md
│   ├── [Sep 30 17:13]  PIPELINE_IMPROVEMENTS_SUMMARY.md
│   ├── [Sep 29 14:25]  PIPELINE_STATUS.md
│   ├── [Sep 30 17:13]  QA_GAP_ANALYSIS.md
│   ├── [Oct  5 22:09]  README.md
│   ├── [Sep 30 17:20]  RELEASE_NOTES_v0.3.0.md
│   ├── [Sep 29 14:25]  RELEASE_PLAN.md
│   ├── [Sep 30 17:13]  RELEASE_READY_SUMMARY.md
│   ├── [Sep 30 17:13]  RULES_GENERATION_IMPROVEMENTS.md
│   ├── [Sep 30 17:13]  SESSION_SUMMARY.md
│   ├── [Sep 30 17:13]  TEST_IMPROVEMENTS.md
│   ├── [Sep 30 17:13]  TYPESCRIPT_ERRORS_STATUS.md
│   ├── [Sep 30 17:13]  TYPESCRIPT_FIX_SUMMARY.md
│   └── [Sep 30 17:13]  VALIDATION_IMPROVEMENTS.md
├── [Oct  2 22:31]  CHANGELOG.md
├── [Oct  4 22:02]  CLAUDE_RULES_IMPLEMENTATION.md
├── [Oct  9 22:30]  claude-plugin
│   ├── [Oct  9 21:23]  Architecture.md
│   ├── [Oct  9 22:31]  ChatGPT App
│   │   ├── [Oct  9 22:31]  Architecture.md
│   │   ├── [Oct  9 22:31]  ImplementationPlan.md
│   │   └── [Oct  9 22:30]  PRD.md
│   ├── [Oct  9 21:08]  MRD.md
│   └── [Oct  9 21:20]  PRD.md
├── [Jul 15 02:29]  CONTRIBUTING.md
├── [Oct  5 14:06]  DEPLOYMENT.md
├── [Sep 30 17:13]  EFFECT_LINTER_RULES.md
├── [Jul 21 16:18]  IdiomaticEffect.mdx
├── [Jul  6 17:45]  patterns-guide.md
├── [Oct  5 22:09]  roadmap
│   └── [Jun 30 17:13]  ROADMAP.md
├── [Oct  5 13:13]  SERVER_IMPLEMENTATION_COMPLETE.md
├── [Aug  6 15:37]  SERVICE_PATTERNS.md
├── [Oct  4 22:07]  STEP_1_SERVER_BOILERPLATE.md
├── [Oct  5 13:19]  STEP_2_RULES_ENDPOINT.md
├── [Jul 15 02:30]  template.mdx
└── [Oct  9 23:32]  tree.md

5 directories, 46 files
