# k8s-pod-annotator

The purpose of this application is to inject node labels as environment variables to pods from a selected namespace.

## Local development

Enter shell with `./shell.sh` and then watch for changes with `./cli.sh watch`.

To test interaction with k8s, run a proxy, so that exposed address is available through `https` (e.g. using [ngrok](https://ngrok.com): `ngrok http 8080`).

## Deployment

Helm chart is provided in `charts` directory. 
Most importantly, it requires `mutationWebhook.baseUrl` value to be specified. 

`baseUrl` describes location where the application is accessible. It must start with `https://` and it mustn't end with `/` (e.g. `https://example.com` is a valid `baseUrl`).

Admission controllers must be accessible via `https`, so to make the application accessible reverse proxy that will handle `https` traffic should be placed in front. 

For testing deployment on minikube, something like [mitmproxy](https://github.com/mitmproxy/mitmproxy) might come in handy:
```shell
mitmproxy -p 8080 --mode reverse:http://pod-annotator.mynamespace.svc.cluster.local
```
