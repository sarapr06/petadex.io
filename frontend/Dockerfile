# ── base ──────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
# Gatsby needs these at build time
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci

# ── dev (used by docker-compose) ─────────────────────────────────
FROM base AS dev
COPY . .
EXPOSE 8000
CMD ["npm", "run", "develop", "--", "--host", "0.0.0.0", "--port", "8000"]

# ── production build ──────────────────────────────────────────────
FROM base AS build
ARG GATSBY_API_URL
ENV GATSBY_API_URL=$GATSBY_API_URL
COPY . .
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=build /app/public /usr/share/nginx/html
EXPOSE 80



