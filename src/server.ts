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
import { Application, oakHelpers, Router } from "./deps/oak.ts";

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
  const router = new Router();
  router
    .get("/healthz", (context) => {
      context.response.body = "It works!";
    })
    .post("/mutate", async (context) => {
      logger.info("Received admissionReview mutation request");
      const requestBody = await context.request
        .body({
          type: "json",
        })
        .value;

      const admissionReview = validateV1AdmissionReview(requestBody);

      if (!admissionReview.isSuccess) {
        const message = `Validation of admissionReview request has failed: ${
          JSON.stringify(admissionReview.errors, null, 2)
        }`;

        logger.error(message);
        context.response.status = 400;
        context.response.body = message;
      } else if (!admissionReview.value.request) {
        const message = 'Validation failed, "request" field is not defined.';
        context.response.status = 400;
        context.response.body = message;
      } else {
        const podValidation = validateV1Pod(
          admissionReview.value.request.object,
        );
        if (!podValidation.isSuccess) {
          const message = "Pod request validation has failed.";
          logger.error(message);
          context.response.status = 400;
          context.response.body = message;
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
          context.response.status = 200;
          context.response.body = result;
        }
      }
    })
    .post("/sync-pod", async (context) => {
      const requestQuery = oakHelpers.getQuery(context);

      logger.info(
        `Received sync-pod request: ${JSON.stringify(requestQuery)}`,
      );

      const queryValidation = validateSyncPodQuery(requestQuery);

      if (!queryValidation.isSuccess) {
        context.response.status = 400;
        context.response.body = queryValidation.errors;
        return;
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
      context.response.status = 200;
      context.response.body = {};
    });

  const app = new Application();

  app.use(router.routes());

  return app;
}
