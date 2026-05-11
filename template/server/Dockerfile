# ─────────────────────────────────────────────────────────────
# {{PROJECT_NAME}} Server — Docker image
# Runs Admin API + Site API + migrations + seed
# ─────────────────────────────────────────────────────────────
FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Entrypoint script handles: migrate → seed → start
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE {{API_PORT}} {{SITE_API_PORT}}

ENTRYPOINT ["/docker-entrypoint.sh"]
