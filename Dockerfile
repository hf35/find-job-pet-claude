# syntax=docker/dockerfile:1

FROM node:22-slim AS base
WORKDIR /app

# Toolchain for native modules (better-sqlite3) in case no prebuilt binary matches
FROM base AS toolchain
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/

FROM toolchain AS build
RUN npm ci
COPY . .
RUN npm run build

FROM toolchain AS prod-deps
RUN npm ci --omit=dev --workspace=server

FROM base
ENV NODE_ENV=production \
    PORT=8844 \
    HOST=0.0.0.0 \
    DATABASE_PATH=/data/app.sqlite
COPY package.json ./
COPY server/package.json server/
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build /app/server/dist server/dist
COPY server/drizzle server/drizzle
COPY --from=build /app/web/dist web/dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8844
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8844)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/dist/index.js"]
