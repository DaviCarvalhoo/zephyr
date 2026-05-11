# ─────────────────────────────────────────────────────────────
# {{PROJECT_NAME}} Admin UI — Docker image
# ─────────────────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE {{ADMIN_UI_PORT}}

# Use dev server for development, bound to all interfaces
CMD ["npm", "run", "dev", "--", "--host"]
