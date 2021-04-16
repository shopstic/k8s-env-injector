import { captureExec, inheritExec } from "./deps/exec-utils.ts";
import {
  IoK8sApiCoreV1ConfigMap,
  IoK8sApimachineryPkgApisMetaV1OwnerReference,
} from "./deps/k8s-utils.ts";

export async function getNodeLabels(
  nodeName: string,
): Promise<Record<string, string>> {
  const stdout = await captureExec({
    run: {
      cmd: [
        "kubectl",
        "get",
        "node",
        "--field-selector",
        `metadata.name=${nodeName}`,
        "-o",
        "jsonpath={.items[*].metadata.labels}",
      ],
    },
  });
  return JSON.parse(stdout);
}

export async function getPodOwnerReference(
  { podName, namespace }: { podName: string; namespace: string },
): Promise<IoK8sApimachineryPkgApisMetaV1OwnerReference> {
  const stdout = await captureExec({
    run: {
      cmd: [
        "kubectl",
        "get",
        "pod",
        podName,
        "--namespace",
        namespace,
        "-o",
        "json",
      ],
    },
  });
  const object = JSON.parse(stdout);
  const ownerReference: IoK8sApimachineryPkgApisMetaV1OwnerReference = {
    apiVersion: object.apiVersion,
    kind: object.kind,
    name: object.metadata.name,
    controller: true,
    uid: object.metadata.uid,
  };
  return ownerReference;
}

export async function createConfigMap(
  { name, namespace, data, ownerReferences }: {
    name: string;
    namespace: string;
    data: Record<string, string>;
    ownerReferences: IoK8sApimachineryPkgApisMetaV1OwnerReference[];
  },
): Promise<void> {
  const mappedData = Object.fromEntries(
    Object
      .entries(data)
      .map(([
        key,
        value,
      ]) => [`NODE_LABEL_${key.replace(/\W/g, "_").toUpperCase()}`, value]),
  );

  const configMapDefinition: IoK8sApiCoreV1ConfigMap = {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name,
      namespace,
      ownerReferences,
    },
    data: mappedData,
  };

  await inheritExec({
    run: {
      cmd: ["kubectl", "apply", "-f", "-"],
    },
    stdin: JSON.stringify(configMapDefinition),
  });
}
