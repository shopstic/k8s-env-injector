FROM shopstic/bin-dumb-init:1.2.2 as bin-dumb-init
FROM shopstic/bin-kubectl:1.20.4 as bin-kubectl
FROM shopstic/bin-deno:1.9.0 as bin-deno

FROM debian:stable-20210408-slim

RUN \
  apt-get update && \
  apt-get install -y procps

RUN \
  groupadd --gid 5000 app && \
  useradd --home-dir /home/app --create-home --uid 5000 \
  --gid 5000 --shell /bin/bash --skel /dev/null app

COPY --from=bin-dumb-init /usr/bin/dumb-init /usr/bin/dumb-init
COPY --from=bin-kubectl /usr/bin/kubectl /usr/bin/kubectl
COPY --from=bin-deno /usr/bin/deno /usr/bin/deno

COPY ./app.js /home/app/app.js

USER app:app
WORKDIR /home/app

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["deno", "run", "-A", "/home/app/app.js"]