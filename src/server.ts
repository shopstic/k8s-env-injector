import { loggerWithContext } from "./logger.ts";
import { validateV1AdmissionReview, validateV1Pod } from "./validation.ts";
import { mutatePodAdmission } from "./patches.ts";
import {
  createConfigMap,
  getNodeLabels,
  getPodOwnerReference,
} from "./k8s-api.ts";
import { V1AdmissionReview } from "./generated.ts";
import { Type } from "./deps/typebox.ts";
import { createValidator } from "./deps/validation-utils.ts";
import { opine, opineJson } from "./deps/opine.ts";

const logger = loggerWithContext("server");

const validateSyncPodQuery = createValidator(Type.Object({
  nodeName: Type.String({ minLength: 1 }),
  podName: Type.String({ minLength: 1 }),
  namespace: Type.String({ minLength: 1 }),
  configMapName: Type.String({ minLength: 1 }),
}));

export function create(
  settings: { webhookExternalBaseUrl: string; defaultConfigMapPrefix: string },
) {
  const app = opine();

  app.use(opineJson());

  return app
    .get("/healthz", (_, res) => {
      res.send("It works!");
    })
    .post("/mutate", (req, res) => {
      logger.info("Received admissionReview mutation request");
      const admissionReview = validateV1AdmissionReview(req.parsedBody);

      if (!admissionReview.isSuccess) {
        const message = `Validation of admissionReview request has failed: ${
          JSON.stringify(admissionReview.errors, null, 2)
        }`;
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
          const patches = mutatePodAdmission({
            pod: podSpec,
            webhookExternalBaseUrl: settings.webhookExternalBaseUrl,
            defaultConfigMapPrefix: settings.defaultConfigMapPrefix,
          });
          const base64EncodedPatch = btoa(JSON.stringify(patches));
          const result: V1AdmissionReview = {
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
      logger.info(
        `Received sync-pod request: ${JSON.stringify(req.query)}`,
      );

      const queryValidation = validateSyncPodQuery(req.query);

      if (!queryValidation.isSuccess) {
        return res.setStatus(400).send(queryValidation.errors);
      }

      const { nodeName, podName, namespace, configMapName } =
        queryValidation.value;
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
    });
}
