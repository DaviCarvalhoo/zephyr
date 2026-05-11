#!/bin/bash
#
# knex — wrap the knex CLI so it always runs against THIS server/'s
# knexfile, regardless of which directory the user invoked it from.
#
# Usage:
#   ./knex.sh migrate:latest
#   ./knex.sh migrate:rollback
#   ./knex.sh migrate:make NAME
#   ./knex.sh seed:run
#
# The knexfile sets `migrations.directory` itself (via #root/dirname.js)
# so we don't pass --migrations-directory on the CLI — that flag would
# override the knexfile's path and produce confusing "no migrations
# found" errors when run from a different cwd.

set -e

cd "$(dirname "$0")"
exec npx tsx ./node_modules/knex/bin/cli.js \
    --knexfile core/knexfile.ts \
    "$@"
