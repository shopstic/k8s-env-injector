FROM shopstic/deno:1.8.1 as deno

FROM node:lts-slim

ENV PATH=/root/.deno/bin/:$PATH
COPY --from=deno /root/.deno /root/.deno

WORKDIR /app

COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json

RUN \
  npm ci

COPY ./index.js /app/index.js

ENTRYPOINT ["node", "index.js"]