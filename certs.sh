#!/usr/bin/env bash
set -euo pipefail

generate_cert() {
  local ENV_INJECTOR_SERVICE_NAME=${ENV_INJECTOR_SERVICE_NAME:?"ENV_INJECTOR_SERVICE_NAME env variable is required."}
  local ENV_INJECTOR_NAMESPACE=${ENV_INJECTOR_NAMESPACE:?"ENV_INJECTOR_NAMESPACE env variable is required."}
  local ENV_INJECTOR_CERT_VALIDITY_DAYS=${ENV_INJECTOR_CERT_VALIDITY_DAYS:?"ENV_INJECTOR_CERT_VALIDITY_DAYS env variable is required."}

  SSL_CONFIG_LOCATION=$(mktemp)
  trap "rm ${SSL_CONFIG_LOCATION}" EXIT

  cat <<EOF >>"${SSL_CONFIG_LOCATION}"
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

  openssl genrsa -out key.pem 4096
  openssl req -new -sha256 \
      -out private.csr \
      -key key.pem \
      -config "${SSL_CONFIG_LOCATION}"
  openssl x509 -req \
    -sha256 \
    -days "${ENV_INJECTOR_CERT_VALIDITY_DAYS}" \
    -in private.csr \
    -signkey key.pem \
    -out cert.pem \
    -extensions req_ext \
    -extfile "${SSL_CONFIG_LOCATION}"
}

"$@"
