FROM shopstic/bin-kubectl:1.20.4 as bin-kubectl

FROM debian:stable-20210408-slim

RUN \
  apt-get update && \
  apt-get install -y openssl

RUN \
  groupadd --gid 5000 app && \
  useradd --home-dir /home/app --create-home --uid 5000 \
  --gid 5000 --shell /bin/bash --skel /dev/null app

COPY --from=bin-kubectl /usr/bin/kubectl /usr/bin/kubectl

USER app:app

COPY ./init.sh /usr/bin/init.sh