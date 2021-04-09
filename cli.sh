#!/usr/bin/env bash
set -euo pipefail

gen_types() {
  docker build ./gen 1>&2
  local IMAGE_ID
  IMAGE_ID=$(docker build ./gen -q)
  docker run -i --rm "${IMAGE_ID}" < ./gen/k8s.io.api.admission.v1.swagger.json > ./src/generated.ts
}

code_quality() {
  echo "Checking formatting..."
  deno fmt --unstable --check ./src
  deno fmt --unstable --check ./test
  echo "Linting..."
  deno lint --unstable ./src
  deno lint --unstable ./test
  # echo "Runnning tests..."
  # deno test -A
}

test_helm_chart() {
  cat << EOF | helm template -f - ./charts/env-injector/ > /dev/null
mutationWebhook:
  namespaceSelector:
    matchExpressions:
      - key: shopstic.com/foo
        operator: In
        values: ["bar"]
  objectSelector:
    matchExpressions:
      - key: shopstic.com/foo
        operator: In
        values: ["bar"]
  certificate:
    key: "dummy"
    cert: "dummy"
EOF
}

test() {
  deno test -A ./test
}

compile() {
  # This sed replacement is a temporary workaround for https://github.com/denoland/deno/issues/9810
  deno bundle ./src/app.ts | sed -e 's/await this\._loading\[ref2\] = loadSchema(ref2)/await (this._loading[ref2] = loadSchema(ref2))/g' > ./images/app/app.js
}

watch() {
  deno run --unstable --watch -A ./src/app.ts
}

"$@"