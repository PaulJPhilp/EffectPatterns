#!/bin/bash
# Initialize test database with schema migrations

echo "Creating test database..."
docker exec effect-patterns-db psql -U postgres -c "CREATE DATABASE effect_patterns_test;" 2>/dev/null || echo "Test database already exists"

echo "Running migrations..."
docker exec effect-patterns-db psql -U postgres -d effect_patterns_test < packages/toolkit/src/db/migrations/0000_cute_gertrude_yorkes.sql
docker exec effect-patterns-db psql -U postgres -d effect_patterns_test < packages/toolkit/src/db/migrations/0001_faulty_kitty_pryde.sql

echo "✓ Test database ready"
