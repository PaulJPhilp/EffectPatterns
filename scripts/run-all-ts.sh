#!/bin/bash

# Get command line arguments
startAt=${1:-1}  # Default to 1 if not provided
runCount=$2      # Optional

cd "$(dirname "$0")/../content/src" || exit 1

pwd

# Clean up all .out files first
rm -f *.out

ls -l *.ts

# Check if gtimeout exists (for Mac), otherwise use regular timeout
if command -v gtimeout >/dev/null 2>&1; then
  timeout_cmd="gtimeout"
else
  timeout_cmd="timeout"
fi

# Files that demonstrate error handling (these are expected to contain error messages)
expected_error_files=(
  "create-pre-resolved-effect.ts"
  "define-contracts-with-schema.ts"
  "define-tagged-errors.ts"
  "execute-with-runsync.ts"
  "extract-path-parameters.ts"
  "handle-api-errors.ts"
  "handle-errors-with-catch.ts"
  "handle-flaky-operations-with-retry-timeout.ts"
  "handle-get-request.ts"
  "handle-unexpected-errors-with-cause.ts"
  "mapping-errors-to-fit-your-domain.ts"
  "retry-based-on-specific-errors.ts"
  "solve-promise-problems-with-effect.ts"
  "stream-manage-resources.ts"
  "stream-retry-on-failure.ts"
  "trace-operations-with-spans.ts"
  "use-gen-for-business-logic.ts"
  "use-pipe-for-composition.ts"
  "wrap-asynchronous-computations.ts"
  "wrap-synchronous-computations.ts"
  "write-sequential-code-with-gen.ts"
  "write-tests-that-adapt-to-application-code.ts"
)

# Function to check if a file is in the expected_error_files array
contains_file() {
  local file="$1"
  for expected in "${expected_error_files[@]}"; do
    if [ "$file" = "$expected" ]; then
      return 0
    fi
  done
  return 1
}

# Get list of all non-.d.ts files
files=($(ls *.ts | grep -v \.d\.ts))
total=${#files[@]}

# Adjust startAt to be 0-based index
startAt=$((startAt - 1))

# Calculate end index based on runCount
if [ ! -z "$runCount" ]; then
  endAt=$((startAt + runCount))
  # Make sure endAt doesn't exceed total files
  endAt=$((endAt < total ? endAt : total))
else
  endAt=$total
fi

# Validate startAt
if [ $startAt -lt 0 ] || [ $startAt -ge $total ]; then
  echo "Error: startAt ($((startAt + 1))) must be between 1 and $total"
  exit 1
fi

success=0
fail=0
count=0

echo "Running files $((startAt + 1)) to $endAt (out of $total total files)..."

for f in "${files[@]:$startAt:$((endAt - startAt))}"; do
  ((count++))
  out="$f.out"

  echo "
🏃 Running $((startAt + count))/$total: $f..."
  # Run with bun instead of tsx
  if [ -x "$(command -v $timeout_cmd)" ]; then
    $timeout_cmd 60s bun run "$f" > "$out" 2>&1
  else
    bun run "$f" > "$out" 2>&1
  fi
  code=$?

  echo "----------------------------------------"

  if [ $code -eq 124 ]; then
    echo "⏰ $f timed out"
    echo "TIMEOUT" >> "$out"
    fail=$((fail + 1))
  elif [ ! -s "$out" ]; then
    echo "⚠️  $f produced no output"
    fail=$((fail + 1))
  elif ! contains_file "$f" && grep -qiE 'error|exception|trace|fail' "$out"; then
    # Only mark as failed if it's not in the expected_error_files list
    echo "❌ $f failed"
    echo "Output:"
    echo "----------------------------------------"
    cat "$out"
    echo "----------------------------------------"
    fail=$((fail + 1))
  else
    if contains_file "$f"; then
      echo "✅ $f succeeded (with expected error handling)"
    else
      echo "✅ $f succeeded"
    fi
    echo "Output:"
    echo "----------------------------------------"
    cat "$out"
    echo "----------------------------------------"
    success=$((success + 1))
  fi
done

echo "=============================="
echo "Files run: $((startAt + 1)) to $((startAt + count)) of $total"
echo "Successful runs: $success"
echo "Failed runs: $fail"