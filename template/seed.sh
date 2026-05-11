#!/bin/bash
set -e

echo "Database Setup"
echo "=============="
echo ""

DB_NAME="{{DB_NAME}}"

echo "Creating database '$DB_NAME'..."
createdb "$DB_NAME" 2>/dev/null && echo "Database created" || echo "Database already exists"
echo ""

echo "Running migrations..."
(cd server && npm run migrate:latest)
echo ""

echo "Seeding admin user..."
(cd server && npm run console -- --task=seed-admin --email={{ADMIN_EMAIL}} --password={{ADMIN_PASSWORD}})
echo ""

echo "=============="
echo "Database ready!"
echo ""
