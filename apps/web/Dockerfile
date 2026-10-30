# NODE_IMAGE را می‌شود روی آینه داخلی گذاشت، مثلاً docker.arvancloud.ir/node:20-alpine
ARG NODE_IMAGE=node:20-alpine

# ─── build ───
FROM ${NODE_IMAGE} AS build
ARG NPM_REGISTRY=https://registry.npmjs.org/
ARG ALPINE_MIRROR=
RUN if [ -n "$ALPINE_MIRROR" ]; then sed -i "s#https\?://dl-cdn.alpinelinux.org/alpine#$ALPINE_MIRROR#g" /etc/apk/repositories; fi
ARG NEXT_PUBLIC_SITE_URL
# خالی یعنی درخواست‌های مرورگر به همان دامنه (/api) فرستاده می‌شوند و nginx آن را به API می‌دهد
ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN npm config set registry $NPM_REGISTRY
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ─── run ───
FROM ${NODE_IMAGE}
ARG ALPINE_MIRROR=
RUN if [ -n "$ALPINE_MIRROR" ]; then sed -i "s#https\?://dl-cdn.alpinelinux.org/alpine#$ALPINE_MIRROR#g" /etc/apk/repositories; fi
RUN apk add --no-cache tini
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
