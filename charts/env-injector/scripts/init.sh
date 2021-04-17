CURRENT_CERT=""

if ! CURRENT_CERT=$(kubectl get -n "${ENV_INJECTOR_NAMESPACE}" "secret/${ENV_INJECTOR_SECRET_NAME}" "-o=jsonpath={.data['cert\.pem']}") || [[ "${CURRENT_CERT}" == "" ]]; then
  ENV_INJECTOR_SERVICE_NAME=${ENV_INJECTOR_SERVICE_NAME:?"ENV_INJECTOR_SERVICE_NAME env variable is required."}
  ENV_INJECTOR_NAMESPACE=${ENV_INJECTOR_NAMESPACE:?"ENV_INJECTOR_NAMESPACE env variable is required."}
  ENV_INJECTOR_CERT_VALIDITY_DAYS=${ENV_INJECTOR_CERT_VALIDITY_DAYS:?"ENV_INJECTOR_CERT_VALIDITY_DAYS env variable is required."}

  TEMP_DIR
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
  commonName         = Common Name (e.g. server FQDN or YOUR name)
  commonName_max     = 64
  commonName_default = ${ENV_INJECTOR_SERVICE_NAME}.${ENV_INJECTOR_NAMESPACE}.svc

  [req_ext]
  subjectAltName = @alt_names

  [alt_names]
  DNS.1 = ${ENV_INJECTOR_SERVICE_NAME}
  DNS.2 = ${ENV_INJECTOR_SERVICE_NAME}.${ENV_INJECTOR_NAMESPACE}
  DNS.3 = ${ENV_INJECTOR_SERVICE_NAME}.${ENV_INJECTOR_NAMESPACE}.svc
EOF

  openssl genrsa -out "${SSL_KEY_PATH}" 4096

  openssl req -new -sha256 \
      -out "${SSL_PRIVATE_PATH}" \
      -key "${SSL_KEY_PATH}" \
      -config "${SSL_CONFIG_PATH}"

  openssl x509 -req \
    -sha256 \
    -days "${ENV_INJECTOR_CERT_VALIDITY_DAYS}" \
    -in "${SSL_PRIVATE_PATH}" \
    -signkey "${SSL_KEY_PATH}" \
    -out "${SSL_CERT_PATH}" \
    -extensions req_ext \
    -extfile "${SSL_CONFIG_PATH}"

cat <<EOF | kubectl create -f -
apiVersion: v1
kind: Secret
metadata:
  name: ${ENV_INJECTOR_SECRET_NAME}
  namespace: ${ENV_INJECTOR_NAMESPACE}
type: Opaque
data:
  "cert.pem": $(base64 "${SSL_CERT_PATH}")
  "key.pem": $(base64 "${SSL_KEY_PATH}")
EOF
fi

echo "${ENV_INJECTOR_MUTATING_WEBHOOK_CONFIGRATION_TEMPLATE//%%MUTATING_WEBHOOK_CONFIGURATION_CA_BUNDLE%%/${CURRENT_CERT}}" | kubectl apply -f -

