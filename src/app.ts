import { loggerWithContext } from "./logger.ts";
import { json, opine } from "https://deno.land/x/opine@1.2.0/mod.ts";
import { validateV1AdmissionReview, validateV1Pod } from "./validation.ts";
import { mutatePodAdmission } from "./patches.ts";
import {
  createConfigMap,
  getNodeLabels,
  getPodOwnerReference,
} from "./k8s-api.ts";
import { loadSettings } from "./settings.ts";

const settings = loadSettings();

const logger = loggerWithContext("main");

const serverInterface = "0.0.0.0";
const serverPort = 8080;

const app = opine();

app.use(json());

app
  .get("/", (req, res) => {
    logger.info(
      "Got request",
      Array
        .from(req.headers.entries()).map(([key, value]) => `${key}=${value}`)
        .join(" "),
      req.parsedBody,
    );
    res.send("Hello World");
  })
  .post("/mutate", (req, res) => {
    logger.info("Received admissionReview mutation request");
    const webhookHost = settings.baseUrl;
    const admissionReview = validateV1AdmissionReview(req.parsedBody);
    if (!admissionReview.isSuccess) {
      const message = "Validation of admissionReview request has failed.";
      logger.error(message);
      res.setStatus(400).send(message);
    } else if (!admissionReview.value.request) {
      const message = 'Validation failed, "request" field is not defined.';
      logger.error(message);
      res.setStatus(400).send(message);
    } else {
      const podValidation = validateV1Pod(
        admissionReview.value.request.object,
      );
      if (!podValidation.isSuccess) {
        const message = "Pod request validation has failed.";
        logger.error(message);
        res.setStatus(400).send(message);
      } else {
        const podSpec = podValidation.value;
        const patches = mutatePodAdmission({ pod: podSpec, webhookHost });
        const base64EncodedPatch = btoa(JSON.stringify(patches));
        const result = {
          apiVersion: "admission.k8s.io/v1",
          kind: "AdmissionReview",
          response: {
            uid: admissionReview.value.request.uid,
            allowed: true,
            patchType: "JSONPatch",
            patch: base64EncodedPatch,
          },
        };
        logger.info("Responding with 200 to MutatingWebhookConfiguration");
        res.setStatus(200).send(result);
      }
    }
  })
  .post("/sync-pod", async (req, res) => {
    logger.info(`Received got sync-pod request: ${req.query}`);
    const { nodeName, podName, namespace, configMapName } = req.query;
    const nodeLabelsPromise = getNodeLabels(nodeName);
    const podOwnerReferencesPromise = getPodOwnerReference({
      podName,
      namespace,
    });
    const [nodeLabels, podOwnerReference] = await Promise.all([
      nodeLabelsPromise,
      podOwnerReferencesPromise,
    ]);

    await createConfigMap({
      name: configMapName,
      ownerReferences: [podOwnerReference],
      namespace,
      data: nodeLabels,
    });
    logger.info(`sync-pod completed successfully`);
    res.setStatus(200).send({});
  })
  .listen(`${serverInterface}:${serverPort}`);

logger.info(
  `Pod annotation Admission Controller started at ${serverInterface}:${serverPort}`,
);
