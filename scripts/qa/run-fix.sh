#!/bin/bash

# run-fix.sh
#
# Make fix.sh executable and run it

echo "Making fix.sh executable..."
chmod +x fix.sh
echo "Made fix.sh executable"

echo "Running fix.sh..."
./fix.sh
echo "Permissions fixed successfully!"

echo "You can now run the QA process script with: bun run qa:process"
