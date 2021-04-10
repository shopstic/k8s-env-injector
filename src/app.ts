import { loggerWithContext } from "./logger.ts";
import { loadSettings } from "./settings.ts";
import { create as createServer } from "./server.ts";

const settings = loadSettings();

const logger = loggerWithContext("main");
const server = createServer({
  webhookExternalBaseUrl: settings.baseUrl,
  defaultConfigMapPrefix: settings.defaultConfigMapPrefix,
});

const serverInterface = "0.0.0.0";
const serverPort = 8443;

const serverOptions = {
  hostname: serverInterface,
  port: serverPort,
  certFile: settings.certFilePath,
  keyFile: settings.keyFilePath,
};

server.listen(serverOptions);

logger.info(
  `k8s-env-injector Admission Controller started at ${serverInterface}:${serverPort}`,
);
