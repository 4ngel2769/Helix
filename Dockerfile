# Helix bot image. All runtime config comes from environment variables
# (src/config.ts and .env files are gitignored and excluded below).
FROM oven/bun:1-debian

WORKDIR /app

# canvas (greeting cards) needs Cairo/Pango build libs; curl backs the healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev curl \
    && rm -rf /var/lib/apt/lists

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production

# deploy = build (tsc -> dist) + start (dist/index.js)
CMD ["bun", "run", "deploy"]
