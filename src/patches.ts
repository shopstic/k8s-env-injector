import type {
  AdmissionReviewRequestObjectPod,
  SimplifiedContainer,
} from "./schemas.ts";
import { jsonPatch, uuid } from "./deps.ts";

export function mutatePodAdmission({ pod, webhookExternalBaseUrl }: {
  pod: AdmissionReviewRequestObjectPod;
  webhookExternalBaseUrl: string;
}): jsonPatch.Operation[] {
  const configMapName = generateConfigMapName(pod);
  const clonedPod: AdmissionReviewRequestObjectPod = JSON.parse(
    JSON.stringify(pod),
  );
  addConfigMapBasedEnvVars({ pod: clonedPod, configMapName });
  addInitContainer({ pod: clonedPod, configMapName, webhookExternalBaseUrl });
  return jsonPatch.compare(pod, clonedPod);
}

function generateConfigMapName(pod: AdmissionReviewRequestObjectPod): string {
  const suffix = `node-labels-${uuid.v4.generate()}`;
  const maxNameLength = 63;
  let prefix: string;

  const generateName = pod.metadata?.generateName;

  if (generateName) {
    prefix = generateName;
  } else {
    prefix = `generated-cm-`;
  }

  return `${prefix.substring(0, maxNameLength - suffix.length)}${suffix}`;
}

function addInitContainer({ pod, configMapName, webhookExternalBaseUrl }: {
  pod: AdmissionReviewRequestObjectPod;
  configMapName: string;
  webhookExternalBaseUrl: string;
}): void {
  const extraInitContainer = initContainer({
    configMapName,
    webhookExternalBaseUrl,
  });

  if (!pod.spec.initContainers || pod.spec.initContainers.length == 0) {
    pod.spec.initContainers = [extraInitContainer];
  } else {
    pod.spec.initContainers.unshift(extraInitContainer);
  }
}

function addConfigMapBasedEnvVars(
  { pod, configMapName }: {
    pod: AdmissionReviewRequestObjectPod;
    configMapName: string;
  },
): void {
  if (pod.spec.initContainers) {
    pod.spec.initContainers.forEach((container) =>
      addConfigMapBasedEnvVarsToContainer({ container, configMapName })
    );
  }
  if (pod.spec.containers) {
    pod.spec.containers.forEach((container) =>
      addConfigMapBasedEnvVarsToContainer({ container, configMapName })
    );
  }
}

function addConfigMapBasedEnvVarsToContainer(
  { container, configMapName }: {
    container: SimplifiedContainer;
    configMapName: string;
  },
): void {
  const labelsConfigMapRef = {
    configMapRef: {
      name: configMapName,
      // optional: true,
    },
  };

  if (!container.envFrom) {
    container.envFrom = [labelsConfigMapRef];
  } else {
    container.envFrom.unshift(labelsConfigMapRef);
  }
}

function initContainer(
  { configMapName, webhookExternalBaseUrl }: {
    configMapName: string;
    webhookExternalBaseUrl: string;
  },
): SimplifiedContainer {
  return {
    name: "node-labels-to-configmap-populator",
    image: "curlimages/curl:7.75.0",
    imagePullPolicy: "IfNotPresent",
    env: [
      {
        name: "NODE_NAME",
        valueFrom: {
          fieldRef: {
            fieldPath: "spec.nodeName",
          },
        },
      },
      {
        name: "POD_NAME",
        valueFrom: {
          fieldRef: {
            fieldPath: "metadata.name",
          },
        },
      },
      {
        name: "NAMESPACE",
        valueFrom: {
          fieldRef: {
            fieldPath: "metadata.namespace",
          },
        },
      },
      {
        name: "CONFIG_MAP_NAME",
        value: configMapName,
      },
      {
        name: "ENDPOINT",
        value:
          `${webhookExternalBaseUrl}/sync-pod?nodeName=$(NODE_NAME)&podName=$(POD_NAME)&namespace=$(NAMESPACE)&configMapName=$(CONFIG_MAP_NAME)`,
      },
    ],
    args: ["-kX", "POST", "$(ENDPOINT)"],
  };
}
