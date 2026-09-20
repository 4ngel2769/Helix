# Helix dashboard image (Bun server serving the built Vite SPA + OAuth/API proxy).
# Build context is the REPO ROOT (see docker-compose.yml). All runtime config
# comes from environment variables (dashboard/.env is gitignored).
FROM oven/bun:1-debian

WORKDIR /app/dashboard

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists

COPY dashboard/package.json dashboard/bun.lock ./
RUN bun install --frozen-lockfile

COPY dashboard/ ./

# vite build -> dist/ (served by the Bun server)
RUN bun run build

ENV NODE_ENV=production

EXPOSE 3000

# start = bun server/index.ts (serves dist/ + API proxy + OAuth)
CMD ["bun", "run", "start"]
