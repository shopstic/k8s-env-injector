#!/usr/bin/env bash
set -euo pipefail

ENV_INJECTOR_NAME=${ENV_INJECTOR_NAME:?"ENV_INJECTOR_NAME env variable is required"}
ENV_INJECTOR_INIT_NAME=${ENV_INJECTOR_INIT_NAME:?"ENV_INJECTOR_INIT_NAME env variable is required"}
ENV_INJECTOR_NAMESPACE=${ENV_INJECTOR_NAMESPACE:?"ENV_INJECTOR_NAMESPACE env variable is required"}
ENV_INJECTOR_SECRET_NAME=${ENV_INJECTOR_SECRET_NAME:?"ENV_INJECTOR_SECRET_NAME env variable is required"}
ENV_INJECTOR_MUTATING_WEBHOOK_CONFIGRATION_TEMPLATE=${ENV_INJECTOR_MUTATING_WEBHOOK_CONFIGRATION_TEMPLATE:?"ENV_INJECTOR_MUTATING_WEBHOOK_CONFIGRATION_TEMPLATE env variable is required"}

ENV_INJECTOR_CERT=""

if ! ENV_INJECTOR_CERT=$(kubectl get -n "${ENV_INJECTOR_NAMESPACE}" "secret/${ENV_INJECTOR_SECRET_NAME}" "-o=jsonpath={.data['cert\.pem']}") || [[ "${ENV_INJECTOR_CERT}" == "" ]]; then

  TEMP_DIR="/dev/shm/$(mktemp -u XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX)"
  mkdir -p "${TEMP_DIR}"
  trap "rm -Rf ${TEMP_DIR}" EXIT

  SSL_CONFIG_PATH="${TEMP_DIR}/config"
  SSL_KEY_PATH="${TEMP_DIR}/key.pem"
  SSL_PRIVATE_PATH="${TEMP_DIR}/private.csr"
  SSL_CERT_PATH="${TEMP_DIR}/cert.pem"

cat <<EOF > "${SSL_CONFIG_PATH}"
[req]
default_bits       = 4096
distinguished_name = req_distinguished_name
req_extensions     = req_ext

[req_distinguished_name]
commonName         = ${ENV_INJECTOR_NAME}.${ENV_INJECTOR_NAMESPACE}.svc
commonName_max     = 64
commonName_default = ${ENV_INJECTOR_NAME}.${ENV_INJECTOR_NAMESPACE}.svc

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${ENV_INJECTOR_NAME}
DNS.2 = ${ENV_INJECTOR_NAME}.${ENV_INJECTOR_NAMESPACE}
DNS.3 = ${ENV_INJECTOR_NAME}.${ENV_INJECTOR_NAMESPACE}.svc
EOF

  openssl genrsa -out "${SSL_KEY_PATH}" 4096

  openssl req -new -sha256 \
      -out "${SSL_PRIVATE_PATH}" \
      -key "${SSL_KEY_PATH}" \
      -subj "/CN=${ENV_INJECTOR_NAME}.${ENV_INJECTOR_NAMESPACE}.svc" \
      -config "${SSL_CONFIG_PATH}"

  openssl x509 -req \
    -sha256 \
    -days "36500" \
    -in "${SSL_PRIVATE_PATH}" \
    -signkey "${SSL_KEY_PATH}" \
    -out "${SSL_CERT_PATH}" \
    -extensions req_ext \
    -extfile "${SSL_CONFIG_PATH}"

  ENV_INJECTOR_CERT=$(base64 -w 0 "${SSL_CERT_PATH}")
  SECRET_YAML=$(cat <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: ${ENV_INJECTOR_SECRET_NAME}
  namespace: ${ENV_INJECTOR_NAMESPACE}
type: Opaque
data:
  "cert.pem": ${ENV_INJECTOR_CERT}
  "key.pem": $(base64 -w 0 "${SSL_KEY_PATH}")
EOF
)

echo "Creating secret ${ENV_INJECTOR_SECRET_NAME}"
echo "${SECRET_YAML}" | kubectl create -f -

fi

ENV_INJECTOR_NAMESPACE_UID=$(kubectl get namespace "${ENV_INJECTOR_NAMESPACE}" "-o=jsonpath={.metadata.uid}")

echo "Patching ClusterRole ${ENV_INJECTOR_INIT_NAME} with ownerReference UID ${ENV_INJECTOR_NAMESPACE_UID}"
cat <<EOF | kubectl patch clusterrole "${ENV_INJECTOR_INIT_NAME}" --type merge -p "$(cat)"
metadata:
  ownerReferences:
    - apiVersion: v1
      blockOwnerDeletion: true
      controller: true
      kind: Namespace
      name: ${ENV_INJECTOR_NAMESPACE}
      uid: ${ENV_INJECTOR_NAMESPACE_UID}
EOF

echo "Patching ClusterRoleBinding ${ENV_INJECTOR_INIT_NAME} with ownerReference UID ${ENV_INJECTOR_NAMESPACE_UID}"
cat <<EOF | kubectl patch clusterrolebinding "${ENV_INJECTOR_INIT_NAME}" --type merge -p "$(cat)"
metadata:
  ownerReferences:
    - apiVersion: v1
      blockOwnerDeletion: true
      controller: true
      kind: Namespace
      name: ${ENV_INJECTOR_NAMESPACE}
      uid: ${ENV_INJECTOR_NAMESPACE_UID}
EOF

ENV_INJECTOR_MUTATING_WEBHOOK_CONFIGRATION_TEMPLATE=${ENV_INJECTOR_MUTATING_WEBHOOK_CONFIGRATION_TEMPLATE//%%CA_BUNDLE%%/${ENV_INJECTOR_CERT}}
ENV_INJECTOR_MUTATING_WEBHOOK_CONFIGRATION_TEMPLATE=${ENV_INJECTOR_MUTATING_WEBHOOK_CONFIGRATION_TEMPLATE//%%OWNER_NAMESPACE_UID%%/${ENV_INJECTOR_NAMESPACE_UID}}

echo "Updating MutatingWebhookConfigration"
echo "${ENV_INJECTOR_MUTATING_WEBHOOK_CONFIGRATION_TEMPLATE}" | kubectl apply -f -


