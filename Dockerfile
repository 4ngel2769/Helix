# Helix bot image. All runtime config comes from environment variables
# (src/config.ts and .env files are gitignored and excluded below).
FROM oven/bun:1-debian

WORKDIR /app

# canvas (greeting cards) needs Cairo/Pango build libs; curl/wget back healthchecks.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev curl wget \
    && rm -rf /var/lib/apt/lists

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# src/config.ts is gitignored, so a fresh clone has no copy. Derive it from
# the example (values are all env-driven at runtime) so tsc always has the
# full config shape — including `support` — to compile against.
# Building (tsc) at IMAGE time, not container start: a compile break fails
# the build visibly instead of crash-looping the container, and restarts
# become instant.
RUN if [ ! -f src/config.ts ]; then cp src/config.example.ts src/config.ts; fi \
    && grep -q "support" src/config.ts \
    && bun run build

ENV NODE_ENV=production

# dist/ is already compiled above — just start it.
CMD ["bun", "run", "start"]
