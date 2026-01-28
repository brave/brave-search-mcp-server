FROM node:alpine@sha256:da5dc26b238da14950248568e9a3c5a01611c755685faec93dd59f1e39914e3c AS builder

RUN apk add --no-cache openssl=3.5.5-r0

WORKDIR /app

COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json

RUN npm ci --ignore-scripts

COPY ./src ./src
COPY ./tsconfig.json ./tsconfig.json

RUN npm run build

FROM node:alpine@sha256:da5dc26b238da14950248568e9a3c5a01611c755685faec93dd59f1e39914e3c AS release

RUN apk add --no-cache openssl=3.5.5-r0

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production

RUN npm ci --ignore-scripts --omit-dev

USER node

ENTRYPOINT ["node", "dist/index.js"]
