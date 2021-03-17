#!/usr/bin/env bash
set -euo pipefail

ci_build_in_shell() {
  local DENO_DIR=${DENO_DIR:?"DENO_DIR env variable is required"}
  local IMAGE_NAME=${IMAGE_NAME:?"IMAGE_NAME env variable is required"}
  local IMAGE_TAG=${IMAGE_TAG:?"IMAGE_TAG env variable is required"}
  local GITHUB_WORKSPACE=${GITHUB_WORKSPACE:?"GITHUB_WORKSPACE env variable is required"}

  cat <<EOF | docker run \
    --workdir /repo \
    -i \
    --rm \
    -v "${GITHUB_WORKSPACE}:/repo" \
    -v "${DENO_DIR}:/root/.cache/deno" \
    -e "DENO_DIR=/root/.cache/deno" \
    "${IMAGE_NAME}:${IMAGE_TAG}" \
    bash -l
set -euo pipefail

./cli.sh code_quality
./cli.sh compile
EOF

}

gen_types() {
  docker build ./gen 1>&2
  local IMAGE_ID
  IMAGE_ID=$(docker build ./gen -q)
  docker run -i --rm "${IMAGE_ID}" < ./gen/k8s.io.api.admission.v1.swagger.json > ./src/generated.ts
}

code_quality() {
  echo "Checking formatting..."
  deno fmt --unstable --check ./src
  echo "Linting..."
  deno lint --unstable ./src
  # echo "Runnning tests..."
  # deno test -A
}

compile() {
  # This sed replacement is a temporary workaround for https://github.com/denoland/deno/issues/9810
  deno bundle ./src/app.ts | sed -e 's/await this\._loading\[ref2\] = loadSchema(ref2)/await (this._loading[ref2] = loadSchema(ref2))/g' > ./build/app.js
}

watch() {
  deno run --unstable --watch -A ./src/app.ts
}

"$@"