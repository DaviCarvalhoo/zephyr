#!/bin/bash
#
# test — run a single .test.ts file (or pass a glob).
# Useful when iterating on one suite without re-running everything.
#
# Examples:
#   ./tests/test.sh tests/core/db.test.ts
#   ./tests/test.sh "tests/core/*.test.ts"

node --import tsx --test "$1"
