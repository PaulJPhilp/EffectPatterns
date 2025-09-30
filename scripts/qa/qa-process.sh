#!/bin/bash

# qa-process.sh
#
# QA processing script for Effect Patterns. Processes all MDX files in content/new/processed:
# - Runs QA validation against each pattern
# - Produces JSON output with metadata, pass/fail status, and metrics
# - Saves results to content/qa/results/
# - Uses CLI generate command for LLM processing
#
# Usage:
#   ./qa-process.sh [--debug]

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

# Ensure jq is available (used for JSON parsing)
if ! command -v jq &> /dev/null; then
  echo "Error: jq is not installed or not in PATH"
  exit 1
fi

# --- VALIDATION ---
ensure_directories() {
  mkdir -p "$RESULTS_DIR"
  # Clear results folder at start of each run
  rm -f "$RESULTS_DIR"/*.json
}

# --- PATTERN DISCOVERY ---
get_pattern_files() {
  local files=$(find "$PATTERNS_DIR" -name "*.mdx" -type f | sort)
  
  # In debug mode, only return first 5 files
  if [[ "$DEBUG_MODE" == "true" ]]; then
    echo "$files" | head -5
  else
    echo "$files"
  fi
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
  local output_file="$RESULTS_DIR/${file_name%.mdx}-qa.json"
  
  echo "Running QA validation via CLI for: $file_name"
  
  # Run the CLI command to process the prompt with correct arguments
  # CLI writes JSON output directly to the file
  local output_file="$RESULTS_DIR/${file_name%.mdx}-qa.json"
  # Use enhanced QA schema if it exists, otherwise fall back to standard
  local schema_file="$PROMPTS_DIR/qa-schema-enhanced.mdx"
  if [ ! -f "$schema_file" ]; then
    schema_file="$PROMPTS_DIR/qa-schema.mdx"
  fi
  
  if cd "$PROJECT_ROOT" && npx --yes tsx cli/src/main.ts generate \
    --output "$output_file" \
    --output-format json \
    --schema-prompt "$schema_file" \
    "$pattern_path"; then
    # Read the generated JSON file
    if [ -f "$output_file" ]; then
      cat "$output_file"
    else
      echo "Error: Output file not created: $output_file" >&2
      cat << EOF
{
  "patternId": "$id",
  "fileName": "$file_name",
  "validation": {
    "passed": false,
    "errors": ["Output file not created"],
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
  else
    echo "Error running CLI command for: $file_name" >&2
    # Return a basic failure JSON structure
    cat << EOF
{
  "patternId": "$id",
  "fileName": "$file_name",
  "validation": {
    "passed": false,
    "errors": ["CLI execution failed"],
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
  echo "Starting Effect Patterns QA Process..."
  
  ensure_directories
  
  local pattern_files_list
  pattern_files_list=$(get_pattern_files)
  local total_files=$(echo "$pattern_files_list" | wc -l | tr -d ' ')
  
  if [[ "$DEBUG_MODE" == "true" ]]; then
    echo "DEBUG MODE: Processing only first 5 files (out of $total_files total)"
  fi
  
  echo "Found $total_files pattern files to process"
  
  local count=0
  local pass_count=0
  local fail_count=0
  
  # Process each pattern file
  while IFS= read -r pattern_file; do
    if [ -n "$pattern_file" ]; then
      local file_name=$(basename "$pattern_file")
      
      echo "Processing: $file_name"
      
      # Extract metadata
      local metadata
      metadata=$(extract_metadata "$pattern_file")
      
      # Run QA validation - CLI writes JSON directly to file
      run_qa_validation "$pattern_file" "$metadata"
  
      # Read result from file
      local result_file="$RESULTS_DIR/${file_name%.mdx}-qa.json"
      local result_json=""
      if [ -f "$result_file" ]; then
        result_json=$(cat "$result_file")
      else
        result_json='{"patternId":"'${file_name%.mdx}'","fileName":"'$file_name'","validation":{"passed":false,"errors":["Output file not created"],"warnings":[],"suggestions":[]},"metrics":{"tokens":0,"cost":0,"duration":0}}'
      fi
  
      # Check if passed
      local did_pass=$(echo "$result_json" | jq -r '.passed // false')
      
      if [ "$did_pass" = "true" ]; then
        echo "  $file_name ✅"
        pass_count=$((pass_count + 1))
      else
        echo "  $file_name ❌"
        fail_count=$((fail_count + 1))
      fi
      
      count=$((count + 1))
    fi
  done <<< "$pattern_files_list"
  
  echo ""
  echo "QA Process Complete:"
  echo "  Processed: $count"
  echo "  Passed: $pass_count"
  echo "  Failed: $fail_count"
  echo "  Results saved to: $RESULTS_DIR"
}

# --- DEBUG MODE HANDLING ---
# Check for debug flag
DEBUG_MODE="false"
if [[ "$1" == "--debug" ]]; then
  DEBUG_MODE="true"
  echo "Debug mode enabled - processing only first 5 files"
fi

# --- ERROR HANDLING ---
trap 'echo "QA process failed"; exit 1' ERR

main "$@"
