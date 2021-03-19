#!/usr/bin/env bash
set -euo pipefail

docker build ./shell
IMAGE_ID=$(docker build -q ./shell)

docker run \
  -it \
  --rm \
  --privileged \
  --hostname=k8s-env-injector-shell \
  -v "/var/run/docker.sock:/var/run/docker.sock" \
  -v "${HOME}/.kube:/root/.kube" \
  -v "${DENO_DIR}:/root/.cache/deno" \
  -e "DENO_DIR=/root/.cache/deno" \
  -v "${PWD}:${PWD}" \
  -w "${PWD}" \
  "${IMAGE_ID}" \
  bash -l
