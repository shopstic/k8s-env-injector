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
  deno fmt --unstable --check ./src ./test
  echo "Linting..."
  deno lint --unstable ./src ./test
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
EOF
}

test() {
  deno test --lock=lock.json -A ./test
}

compile() {
  deno bundle --lock=lock.json ./src/app.ts > ./images/app/app.js
}

watch() {
  deno run --lock=lock.json --unstable --watch -A ./src/app.ts
}

update_lock() {
  deno cache ./src/deps/*.ts ./test/deps/*.ts  --lock ./lock.json --lock-write
}

push_helm_chart() {
  export HELM_CHART_VERSION=${1:?"Helm chart version is required"}
  export HELM_APP_VERSION=${2:?"Helm chart app version is required"}
  export HELM_CHART_REF=${3:?"Helm chart ref is required"}

  export HELM_EXPERIMENTAL_OCI=1
  export HELM_REGISTRY_CONFIG="${HOME}"/.docker/config.json

  local OUT
  OUT=$(mktemp -d)
  trap "rm -Rf ${OUT}" EXIT

  cp -R ./charts/env-injector "${OUT}/"

  yq e '.version = env(HELM_CHART_VERSION)' -i "${OUT}/env-injector/Chart.yaml"
  yq e '.appVersion = env(HELM_APP_VERSION)' -i "${OUT}/env-injector/Chart.yaml"

  helm package --app-version "${HELM_APP_VERSION}" "${OUT}/env-injector" -d "${OUT}/packaged"
  helm push "${OUT}/packaged/env-injector-${HELM_CHART_VERSION}.tgz" "${HELM_CHART_REF}"
}

"$@"