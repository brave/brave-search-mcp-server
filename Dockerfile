FROM node:alpine@sha256:fd164609b5ab0c6d49bac138ae06c347e72261ec6ae1de32b6aa9f5ee2271110 AS builder

RUN apk add --no-cache openssl=3.5.4-r0

WORKDIR /app

COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json

RUN npm ci --ignore-scripts

COPY ./src ./src
COPY ./tsconfig.json ./tsconfig.json

RUN npm run build

FROM node:alpine@sha256:fd164609b5ab0c6d49bac138ae06c347e72261ec6ae1de32b6aa9f5ee2271110 AS release

RUN apk add --no-cache openssl=3.5.4-r0

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/package-lock.json /app/package-lock.json

ENV NODE_ENV=production

RUN npm ci --ignore-scripts --omit-dev

USER node

ENTRYPOINT ["node", "dist/index.js"]
