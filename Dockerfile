# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
# npm runs an implicit `node-gyp rebuild` for any package with a
# binding.gyp, so better-sqlite3 compiles here even though it ships
# prebuilt binaries. The toolchain stays in this stage only.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
# git and ssh for the olympus export.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git openssh-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000 \
  HOSTNAME=0.0.0.0 \
  DATABASE_PATH=/data/bacon.sqlite \
  OLYMPUS_REPO_PATH=/data/olympus

# GitHub's published ed25519 host key, pinned so the first clone does not
# trust whatever answers on github.com:22.
RUN mkdir -p /home/node/.ssh /data \
  && echo "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl" > /home/node/.ssh/known_hosts \
  && chown -R node:node /home/node/.ssh /data

# Build and runner both use /app on purpose: the standalone output holds an
# absolute symlink to /app/node_modules/better-sqlite3, which resolves to
# the traced copy only at the same path.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Migrations are read at runtime from ./drizzle (see src/lib/db/client.ts).
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --chown=node:node docker/entrypoint.sh /usr/local/bin/bacon-entrypoint
RUN chmod +x /usr/local/bin/bacon-entrypoint

USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["bacon-entrypoint"]
