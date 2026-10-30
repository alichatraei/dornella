# NODE_IMAGE را می‌شود روی آینه داخلی گذاشت، مثلاً docker.arvancloud.ir/node:20-alpine
ARG NODE_IMAGE=node:20-alpine

# ─── build ───
FROM ${NODE_IMAGE} AS build
ARG NPM_REGISTRY=https://registry.npmjs.org/
ARG ALPINE_MIRROR=
RUN if [ -n "$ALPINE_MIRROR" ]; then sed -i "s#https\?://dl-cdn.alpinelinux.org/alpine#$ALPINE_MIRROR#g" /etc/apk/repositories; fi
RUN apk add --no-cache openssl
WORKDIR /app
RUN npm config set registry $NPM_REGISTRY
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ─── run ───
FROM ${NODE_IMAGE}
ARG ALPINE_MIRROR=
RUN if [ -n "$ALPINE_MIRROR" ]; then sed -i "s#https\?://dl-cdn.alpinelinux.org/alpine#$ALPINE_MIRROR#g" /etc/apk/repositories; fi
RUN apk add --no-cache openssl tini
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --chown=node:node package.json docker-entrypoint.sh ./
RUN mkdir -p uploads && chown node:node uploads && chmod +x docker-entrypoint.sh
USER node
EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--", "./docker-entrypoint.sh"]
