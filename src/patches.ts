import type {
  AdmissionReviewRequestObjectPod,
  SimplifiedContainer,
} from "./schemas.ts";
import { uuidV4 } from "./deps/std-uuid.ts";
import { compare, Operation } from "./deps/fast-json-patch.ts";
import {
  createK8sContainer,
  IoK8sApiCoreV1Container,
} from "./deps/k8s-utils.ts";

export function mutatePodAdmission(
  { pod, webhookExternalBaseUrl, defaultConfigMapPrefix }: {
    pod: AdmissionReviewRequestObjectPod;
    webhookExternalBaseUrl: string;
    defaultConfigMapPrefix: string;
  },
): Operation[] {
  const configMapName = generateConfigMapName(pod, defaultConfigMapPrefix);
  const clonedPod: AdmissionReviewRequestObjectPod = JSON.parse(
    JSON.stringify(pod),
  );

  addConfigMapBasedEnvVars({ pod: clonedPod, configMapName });
  addInitContainer({ pod: clonedPod, configMapName, webhookExternalBaseUrl });

  return compare(pod, clonedPod);
}

function generateConfigMapName(
  pod: AdmissionReviewRequestObjectPod,
  defaultPrefix: string,
): string {
  const suffix = `env-${uuidV4.generate()}`;
  const maxNameLength = 62;
  const generateName = pod.metadata?.generateName;

  const prefix = generateName || defaultPrefix;
  const truncatedPrefix = prefix.substring(0, maxNameLength - suffix.length);
  const finalPrefix = (truncatedPrefix.endsWith("-"))
    ? truncatedPrefix
    : truncatedPrefix + "-";

  return `${finalPrefix}${suffix}`;
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
): IoK8sApiCoreV1Container {
  return createK8sContainer({
    name: "node-labels-to-configmap-populator",
    image:
      "docker.io/curlimages/curl:7.76.0@sha256:eba6932609babc097c5c26c5b738a3fa6b43c7e0d5e4a5e32956e2c2e7f5acd1",
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
        name: "CONFIG_MAP_EXISTENCE_TEST",
        valueFrom: {
          configMapKeyRef: {
            optional: true,
            name: configMapName,
            key: "NODE_LABEL_KUBERNETES_IO_HOSTNAME",
          },
        },
      },
    ],
    command: [
      "sh",
      "-c",
      `if [[ "\${CONFIG_MAP_EXISTENCE_TEST}" == "" ]]; then curl -kX POST "${webhookExternalBaseUrl}/sync-pod?nodeName=\${NODE_NAME}&podName=\${POD_NAME}&namespace=\${NAMESPACE}&configMapName=${configMapName}"; fi`,
    ],
  });
}
