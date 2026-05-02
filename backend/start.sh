#!/usr/bin/env bash
# Run the backend, auto-running setup steps the first time.

set -e

cd "$(dirname "$0")"

DB_NAME_DEFAULT="foodopp_db"

if ! command -v node >/dev/null 2>&1; then
    echo "Error: node is not installed." >&2
    exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
    echo "Error: psql is not installed or not on PATH." >&2
    exit 1
fi

if ! psql -l >/dev/null 2>&1; then
    echo "Error: cannot connect to PostgreSQL. Is the server running?" >&2
    echo "  Try: brew services start postgresql" >&2
    exit 1
fi

if [ ! -d node_modules ]; then
    echo "==> Installing npm dependencies..."
    npm install
fi

if [ ! -f .env ]; then
    echo "==> Creating .env from env_example..."
    cp env_example .env
    # Default DB_USER to current macOS/login user
    if [ -n "$USER" ]; then
        # Use a delimiter unlikely to appear in usernames
        sed -i.bak "s|^DB_USER=.*|DB_USER=$USER|" .env && rm -f .env.bak
    fi
    # Generate a random JWT_SECRET
    JWT_RAND=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_RAND|" .env && rm -f .env.bak
    echo "    .env created (DB_USER=$USER, random JWT_SECRET set)."
fi

# Load DB_NAME from .env
DB_NAME=$(grep -E '^DB_NAME=' .env | cut -d= -f2-)
DB_NAME=${DB_NAME:-$DB_NAME_DEFAULT}

if ! psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "==> Creating database '$DB_NAME' and loading schema..."
    psql postgres -c "CREATE DATABASE $DB_NAME;"
    psql "$DB_NAME" -f schema.sql
else
    # DB exists; check that the expected tables are there
    if ! psql "$DB_NAME" -c '\dt' 2>/dev/null | grep -qw users; then
        echo "==> Database exists but schema missing — loading schema.sql..."
        psql "$DB_NAME" -f schema.sql
    fi
fi

echo "==> Starting backend..."
exec node index.js
