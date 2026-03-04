# ── base ──────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── dev (used by docker-compose) ─────────────────────────────────
FROM base AS dev
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# ── production ────────────────────────────────────────────────────
FROM base AS prod
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
