# Kubernetes ENV Injector

[![CI](https://github.com/shopstic/k8s-env-injector/actions/workflows/ci.yaml/badge.svg)](https://github.com/shopstic/k8s-env-injector/actions)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/shopstic/k8s-env-injector/blob/main/LICENSE)

The purpose of `k8s-env-injector` is to inject node labels as environment
variables to pods in a selected namespace.

## Local development

Enter shell with `./shell.sh` and then watch for changes with `./cli.sh watch`.

## Deployment

Helm chart is provided in the `charts` directory.

### Using Helm chart

Values that always need to be specified:

- `mutationWebhook.namespaceSelector`. It should select only the namespace where
  k8s-env-injector is deployed to.
