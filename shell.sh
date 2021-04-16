#!/usr/bin/env bash
set -euo pipefail

export DOCKER_BUILDKIT=1

docker build ./images/shell
IMAGE_ID=$(docker build -q ./images/shell)

docker run \
  -it \
  --rm \
  --init \
  --privileged \
  --hostname=k8s-env-injector-shell \
  -v "${HOME}/.kube:/root/.kube" \
  -v "${DENO_DIR}:/root/.cache/deno" \
  -e "DENO_DIR=/root/.cache/deno" \
  -v "${PWD}:${PWD}" \
  -w "${PWD}" \
  "${IMAGE_ID}" \
  bash -l
