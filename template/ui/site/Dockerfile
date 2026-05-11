# ─────────────────────────────────────────────────────────────
# {{PROJECT_NAME}} Public Site — Docker image
# ─────────────────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE {{SITE_PORT}}

# Use dev server (concurrently watching TS and Tailwind)
CMD ["npm", "run", "dev"]
