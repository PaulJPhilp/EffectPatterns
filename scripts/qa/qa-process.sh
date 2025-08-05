#!/bin/bash

# qa-process.sh
#
# QA processing script for Effect Patterns. Processes all MDX files in content/new/processed:
# - Runs QA validation against each pattern
# - Produces JSON output with metadata, pass/fail status, and metrics
# - Saves results to content/qa/results/
# - Uses CLI process-prompt command for LLM processing
#
# Usage:
#   ./qa-process.sh

set -e  # Exit on any error

# --- CONFIGURATION ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
QA_DIR="$PROJECT_ROOT/content/qa"
PATTERNS_DIR="$PROJECT_ROOT/content/new/processed"
RESULTS_DIR="$QA_DIR/results"
PROMPTS_DIR="$SCRIPT_DIR/prompts"

# Ensure node is available
if ! command -v node &> /dev/null; then
  echo "Error: node is not installed or not in PATH"
  exit 1
fi

# --- VALIDATION ---
ensure_directories() {
  mkdir -p "$RESULTS_DIR"
}

# --- PATTERN DISCOVERY ---
get_pattern_files() {
  find "$PATTERNS_DIR" -name "*.mdx" -type f | sort
}

# --- METADATA EXTRACTION ---
extract_metadata() {
  local file_path="$1"
  local file_name=$(basename "$file_path" .mdx)
  
  # Extract frontmatter using grep and sed
  local title=$(awk '/^---$/,/^---$/ {if(/title:/) {gsub(/title:[[:space:]]*/, ""); print; exit}}' "$file_path" 2>/dev/null || echo "Unknown")
  local id=$(awk '/^---$/,/^---$/ {if(/id:/) {gsub(/id:[[:space:]]*/, ""); print; exit}}' "$file_path" 2>/dev/null || echo "$file_name")
  local skill_level=$(awk '/^---$/,/^---$/ {if(/skillLevel:/) {gsub(/skillLevel:[[:space:]]*/, ""); print; exit}}' "$file_path" 2>/dev/null || echo "Unknown")
  
  # Clean up any quotes from the values - use proper escaping
  title=$(echo "$title" | sed 's/^["'"'"']*["'"'"']*$//')
  id=$(echo "$id" | sed 's/^["'"'"']*["'"'"']*$//')
  skill_level=$(echo "$skill_level" | sed 's/^["'"'"']*["'"'"']*$//')
  
  echo "$id|$title|$skill_level"
}

# --- QA VALIDATION ---
run_qa_validation() {
  local pattern_path="$1"
  local metadata="$2"
  
  IFS='|' read -r id title skill_level <<< "$metadata"
  local file_name=$(basename "$pattern_path")
  
  echo "Running QA validation via CLI for: $file_name"
  
  # Run the CLI command to process the prompt with correct arguments
  local result
            if result=$(OUTPUT_FORMAT="json" SCHEMA_PROMPT="$PROMPTS_DIR/qa-schema.mdx" node --loader ts-node/esm cli/src/main.ts process-prompt "$pattern_path" 2>&1); then
    echo "$result"
  else
    echo "Error running CLI command: $result" >&2
    # Return a basic failure JSON structure
    cat << EOF
{
  "patternId": "$id",
  "fileName": "$file_name",
  "validation": {
    "passed": false,
    "errors": ["CLI execution failed: $result"],
    "warnings": [],
    "suggestions": []
  },
  "metrics": {
    "tokens": 0,
    "cost": 0,
    "duration": 0
  }
}
EOF
    return 1
  fi
}

# --- RESULT SAVING ---
save_result() {
  local result_json="$1"
  local pattern_id="$2"
  
  local result_file="$RESULTS_DIR/${pattern_id}-qa.json"
  echo "$result_json" > "$result_file"
}

# --- MAIN PROCESSING ---
main() {
  echo "Starting QA process..."
  
  ensure_directories
  
  # Get pattern files - replacing mapfile with a more portable solution
  local pattern_files_list=$(get_pattern_files)
  local count=$(echo "$pattern_files_list" | wc -l | tr -d ' ')
  
  echo "Found $count patterns to validate"
  
  if [ "$count" -eq 0 ]; then
    echo "No patterns found to process"
    exit 0
  fi
  
  local processed=0
  local failed=0
  
  while IFS= read -r pattern_file; do
    if [ -n "$pattern_file" ]; then
      local file_name=$(basename "$pattern_file")
      
      echo "Processing: $file_name"
      
      # Extract metadata
      local metadata
      metadata=$(extract_metadata "$pattern_file")
      
      # Run QA validation
      local result_json
      result_json=$(run_qa_validation "$pattern_file" "$metadata")
      
      # Save result
      save_result "$result_json" "${file_name%.mdx}"
      
      # Check if passed
      local passed=$(echo "$result_json" | grep '"passed"' | grep -o 'true\|false')
      
      if [ "$passed" = "true" ]; then
        echo "  $file_name"
      else
        echo "  $file_name"
        failed=$((failed + 1))
      fi
      
      processed=$((processed + 1))
    fi
  done <<< "$pattern_files_list"
  
  echo ""
  echo "QA Process Complete:"
  echo "  Processed: $processed"
  echo "  Passed: $((processed - failed))"
  echo "  Failed: $failed"
  echo "  Results saved to: $RESULTS_DIR"
}

# --- ERROR HANDLING ---
trap 'echo "QA process failed"; exit 1' ERR

main "$@"
