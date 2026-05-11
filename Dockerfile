# ─────────────────────────────────────────────────────────────
# Zephyr CLI — Docker image
# Build once, run anywhere. No local Node.js required.
# ─────────────────────────────────────────────────────────────
FROM node:20-slim

# Install git (needed for git init in generated projects)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /cli

# Copy package manifest first for better layer caching
COPY package.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the CLI source
COPY cli.mjs create.mjs build.mjs icons.mjs update.mjs template-variables.mjs ./
COPY template/ ./template/

# Make the CLI available globally inside the container
RUN npm link

# Output goes to /output inside the container — user mounts their host dir here
VOLUME /output
WORKDIR /output

ENTRYPOINT ["node", "/cli/cli.mjs"]
