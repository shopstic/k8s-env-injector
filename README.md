# k8s-env-injector

The purpose of k8s-env-injector is to inject node labels as environment variables to pods from a selected namespace.

## Local development

Enter shell with `./shell.sh` and then watch for changes with `./cli.sh watch`.

To test interaction with k8s, run a proxy, so that exposed address is available through `https` (e.g. using [ngrok](https://ngrok.com): `ngrok http 8080`).

## Deployment

Helm chart is provided in `charts` directory. 
Two values that always should be specified are:
- `mutationWebhook.namespaceSelector`. It should select only the namespace where k8s-env-injector is deployed to.
- `mutationWebhook.baseUrl` value to be specified. `baseUrl` describes location where the k8s-env-injector is exposed at. 
  It must start with `https://` and it mustn't end with `/` (e.g. `https://example.com` is a valid `baseUrl`).

Admission controllers must be accessible via `https`. 
To make k8s-env-injector accessible, reverse proxy handling `https` traffic should be placed in front. 

For testing deployment on minikube, something like [mitmproxy](https://github.com/mitmproxy/mitmproxy) might come in handy:
```shell
mitmproxy -p 8080 --mode reverse:http://k8s-env-injector.mynamespace.svc.cluster.local
```
