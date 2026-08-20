# Dependencies resolve from package.json + package-lock.json in their own cached
# layer, so editing application code does not invalidate the install. Same shape
# as the backend's Dockerfile.
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci


FROM node:22-alpine AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* is inlined into the client bundle at build time, not read at
# runtime -- an image built with the wrong API URL cannot be fixed by restarting
# it with the right one, which is why this is an ARG and not just an env var on
# the service.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# `node` already exists in the base image at uid/gid 1000, matching the backend's
# own non-root user.
USER node

# The standalone build carries its own minimal server and only the node_modules
# it reaches. `public` and `.next/static` are not part of it and are copied in
# separately, or the app serves markup with no assets.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
