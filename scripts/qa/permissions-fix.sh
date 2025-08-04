#!/bin/bash

# permissions-fix.sh
#
# Fix permissions on all existing QA scripts

echo "Fixing permissions for all QA scripts..."

# Make all the existing scripts executable
chmod +x qa-process.sh
echo "Made executable: qa-process.sh"

chmod +x test-qa-process.sh
echo "Made executable: test-qa-process.sh"

chmod +x test-single-pattern.sh
echo "Made executable: test-single-pattern.sh"

chmod +x permissions-fix.sh
echo "Made executable: permissions-fix.sh"

echo "All QA scripts are now executable."

echo "You can now run the QA process script with: bun run qa:process"
