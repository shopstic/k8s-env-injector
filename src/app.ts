import { loggerWithContext } from "./logger.ts";
import { loadSettings } from "./settings.ts";
import { create as createServer } from "./server.ts";
import { ListenOptions } from "./deps/oak.ts";

const settings = loadSettings();

const logger = loggerWithContext("main");
const server = createServer({
  webhookExternalBaseUrl: settings.baseUrl,
  defaultConfigMapPrefix: settings.defaultConfigMapPrefix,
});

const serverInterface = "0.0.0.0";
const serverPort = 8443;

const serverOptions: ListenOptions = {
  hostname: serverInterface,
  port: serverPort,
  secure: true,
  certFile: settings.certFilePath,
  keyFile: settings.keyFilePath,
};

server.addEventListener("listen", (evt) => {
  const { hostname, port } = evt;
  logger.info(
    `k8s-env-injector mutating admission webhook server started at ${hostname}:${port}`,
  );
});

await server.listen(serverOptions);
