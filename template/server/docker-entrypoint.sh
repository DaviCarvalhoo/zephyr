#!/bin/bash
set -e

echo "══════════════════════════════════════"
echo "  {{PROJECT_NAME}} Server"
echo "══════════════════════════════════════"
echo ""

# Wait for DB to be truly ready (belt + suspenders on top of
# docker-compose healthcheck)
echo "⏳ Waiting for database..."
until node -e "
  const knex = require('knex');
  const db = knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  });
  db.raw('SELECT 1').then(() => { db.destroy(); process.exit(0); })
    .catch(() => { db.destroy(); process.exit(1); });
" 2>/dev/null; do
  sleep 1
done
echo "✅ Database is ready"
echo ""

# Run migrations
echo "📦 Running migrations..."
npm run migrate:latest
echo ""

# Seed admin user (idempotent — skips if already exists)
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
    echo "🌱 Seeding admin user..."
    npm run console -- --task=seed-admin --email="$ADMIN_EMAIL" --password="$ADMIN_PASSWORD" || true
    echo ""
fi

# Start both APIs concurrently
echo "🚀 Starting Admin API (port $PORT) + Site API (port $SITE_API_PORT)..."
echo ""

# Run Admin API in background, Site API in foreground
NODE_OPTIONS='--disable-warning=ExperimentalWarning' npx tsx apps/site-api/app.ts &
NODE_OPTIONS='--disable-warning=ExperimentalWarning' npx tsx apps/api/app.ts
