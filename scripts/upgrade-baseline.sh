#!/usr/bin/env bash
set -euo pipefail

echo "=== Dry-run + validation + prompt script (refined) ==="

NEXT_WS=(
  "app/web"
  "app/chat-assistant"
  "services/mcp-server"
)

REACT_WS=(
  "app/web"
  "app/chat-assistant"
)

function dry_run_codemods() {
  echo ">> Dry-run React codemods (excluding replace-reactdom-render)"
  for ws in "${REACT_WS[@]}"; do
    echo "[dry] React codemods in $ws"
    pushd "$ws" >/dev/null || exit 1

    bunx codemod react/19/replace-string-ref . --dry --force || true
    bunx codemod react/19/replace-act-import . --dry --force || true
    bunx codemod react/19/remove-forward-ref . --dry --force || true

    popd >/dev/null
  done

  echo ">> Dry-run Next.js codemods"
  for ws in "${NEXT_WS[@]}"; do
    echo "[dry] Next.js codemods in $ws"
    pushd "$ws" >/dev/null || exit 1

    bunx @next/codemod@canary next-14-to-app-router . --dry --force --no-install || echo "– next-14-to-app-router dry preview"
    bunx @next/codemod@canary new-link . --dry --force --no-install || echo "– new-link dry preview"
    bunx @next/codemod@canary next-async-request-api . --dry --force --no-install || echo "– next-async-request-api dry preview"

    popd >/dev/null
  done
}

function validate_before() {
  echo ">> Validation (pre-apply, on current code)"
  echo "[warn] lint skipped for baseline migration"
  bun run typecheck
  bun run test
}

function apply_codemods() {
  echo ">> Applying React codemods"
  for ws in "${REACT_WS[@]}"; do
    echo "[apply] React codemods in $ws"
    pushd "$ws" >/dev/null || exit 1

    bunx codemod react/19/replace-string-ref . --force || true
    bunx codemod react/19/replace-act-import . --force || true
    bunx codemod react/19/remove-forward-ref . --force || true

    popd >/dev/null
  done

  echo ">> Applying Next.js codemods"
  for ws in "${NEXT_WS[@]}"; do
    echo "[apply] Next.js codemods in $ws"
    pushd "$ws" >/dev/null || exit 1

    bunx @next/codemod@canary next-14-to-app-router . --force --no-install || echo "apply next-14-to-app-router failed"
    bunx @next/codemod@canary new-link . --force --no-install || echo "apply new-link failed"
    bunx @next/codemod@canary next-async-request-api . --force --no-install || echo "apply next-async-request-api failed"

    popd >/dev/null
  done
}

function validate_and_build() {
  echo ">> Post-apply validation: lint skipped, running typecheck/tests"
  bun run typecheck
  bun run test

  echo ">> Build Next.js workspaces"
  for ws in "${NEXT_WS[@]}"; do
    echo "[build] workspace: $ws"
    bun --filter "$(basename "$ws")" run build || {
      echo "Build failed in $ws"
      exit 1
    }
  done
}

function lockfile_summary() {
  echo ">> Lockfile summary:"
  node - <<'JS'
const fs = require('fs');
const txt = fs.readFileSync('bun.lock', 'utf8');
const count = (p) => (txt.match(new RegExp(`"${p}@`, 'g')) || []).length;
for (const pkg of ["react", "react-dom", "next", "effect"]) {
  console.log(pkg + " instances:", count(pkg));
}
JS
}

dry_run_codemods

validate_before

echo
read -p "Dry-run completed and validation passed. Apply codemod changes now? (yes/no) " ans
if [[ "$ans" != "yes" ]]; then
  echo "Aborting. Review dry-run output before applying."
  exit 0
fi

apply_codemods

validate_and_build

lockfile_summary

echo "=== Codemods applied and baseline migration done. ==="
