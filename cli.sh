#!/usr/bin/env bash
set -euo pipefail

ci_build_shell_image() {
  local GITHUB_WORKSPACE=${GITHUB_WORKSPACE:?"GITHUB_WORKSPACE env variable is required"}
  local IMAGE_NAME=${IMAGE_NAME:?"IMAGE_NAME env variable is required"}
  local IMAGE_TAG=${IMAGE_TAG:?"IMAGE_NAME env variable is required"}
  local IMAGE_WITH_TAG="${IMAGE_NAME}:${IMAGE_TAG}"

  if docker manifest inspect "${IMAGE_WITH_TAG}" > /dev/null; then
    echo "Image ${IMAGE_WITH_TAG} already exists in registry, nothing to do"
    exit 0
  fi

  docker run \
    --workdir /context \
    --rm \
    --security-opt seccomp=unconfined \
    --security-opt apparmor=unconfined \
    -e BUILDKITD_FLAGS=--oci-worker-no-process-sandbox \
     --entrypoint "buildctl-daemonless.sh" \
     -v "${GITHUB_WORKSPACE}/shell:/context" \
     -v "${HOME}/.docker/config.json:/home/user/.docker/config.json" \
     shopstic/buildkit:0.8.2 \
       build \
      --frontend dockerfile.v0 \
      --local context=/context \
      --local dockerfile=/context \
      --output "type=image,name=${IMAGE_WITH_TAG},push=true" \
      --export-cache "type=registry,ref=${IMAGE_NAME}:__buildcache__" \
      --import-cache "type=registry,ref=${IMAGE_NAME}:__buildcache__"
}

ci_build_in_shell() {
  local DENO_DIR=${DENO_DIR:?"DENO_DIR env variable is required"}
  local IMAGE_NAME=${IMAGE_NAME:?"IMAGE_NAME env variable is required"}
  local IMAGE_TAG=${IMAGE_TAG:?"IMAGE_TAG env variable is required"}
  local GITHUB_REF=${GITHUB_REF:?"GITHUB_REF env variable is required"}
  local GITHUB_SHA=${GITHUB_SHA:?"GITHUB_SHA env variable is required"}
  local GITHUB_WORKSPACE=${GITHUB_WORKSPACE:?"GITHUB_WORKSPACE env variable is required"}

  cat <<EOF | docker run \
    --workdir /repo \
    -i \
    --rm \
    -e "GITHUB_SHA=${GITHUB_SHA}" \
    -v "${GITHUB_WORKSPACE}:/repo" \
    -v "${DENO_DIR}:/root/.cache/deno" \
    -e "DENO_DIR=/root/.cache/deno" \
    "${IMAGE_NAME}:${IMAGE_TAG}" \
    bash -l

set -euo pipefail
./cli.sh ci_build

EOF

}

ci_build() {
  ./cli.sh code_quality
  ./cli.sh compile
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
  mkdir -p ./out
  # This sed replacement is a temporary workaround for https://github.com/denoland/deno/issues/9810
  deno bundle ./src/app.ts | sed -e 's/await this\._loading\[ref2\] = loadSchema(ref2)/await (this._loading[ref2] = loadSchema(ref2))/g' > ./out/app.js
  ls -la ./out/app.js
}

watch() {
  deno run --unstable --watch -A ./src/app.ts
}

"$@"