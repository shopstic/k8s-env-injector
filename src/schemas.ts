import { typebox } from "./deps.ts";

const Type = typebox.Type;

function RelaxedObject<T extends typebox.TProperties>(
  properties: T,
): typebox.TObject<T> {
  return Type.Object<T>(properties, { additionalProperties: true });
}

export const PatchOperationSchema = Type.Union([
  Type.Object({
    path: Type.String(),
    op: Type.Literal("add"),
    value: Type.Any(),
  }),
  Type.Object({
    path: Type.String(),
    op: Type.Literal("remove"),
  }),
  Type.Object({
    path: Type.String(),
    op: Type.Literal("replace"),
    value: Type.Any(),
  }),
  Type.Object({
    path: Type.String(),
    op: Type.Literal("move"),
    from: Type.String(),
  }),
  Type.Object({
    path: Type.String(),
    op: Type.Literal("copy"),
    from: Type.String(),
  }),
  Type.Object({
    path: Type.String(),
    op: Type.Literal("test"),
    value: Type.Any(),
  }),
  Type.Object({
    path: Type.String(),
    op: Type.Literal("render"),
    template: Type.String(),
    replace: Type.Boolean(),
    open: Type.Optional(Type.String()),
    close: Type.Optional(Type.String()),
  }),
]);

export type PatchOperation = typebox.Static<typeof PatchOperationSchema>;

export const configMapEnvSourceSchema = RelaxedObject({
  name: Type.String(),
  optional: Type.Optional(Type.Boolean()),
});

export const configMapKeySelectorSchema = RelaxedObject({
  key: Type.String(),
  name: Type.String(),
  optional: Type.Optional(Type.Boolean()),
});

export const objectFieldSelectorSchema = RelaxedObject({
  apiVersion: Type.Optional(Type.String()),
  fieldPath: Type.String(),
});

export const resourceFieldSelectorSchema = RelaxedObject({
  containerName: Type.String(),
  resource: Type.Optional(Type.String()),
});

export const simplifiedEnvVarSourceSchema = RelaxedObject({
  configMapKeyRef: Type.Optional(configMapKeySelectorSchema),
  fieldRef: Type.Optional(objectFieldSelectorSchema),
  resourceFieldRef: Type.Optional(resourceFieldSelectorSchema),
});

export const envVarSchema = RelaxedObject({
  name: Type.String(),
  value: Type.Optional(Type.String()),
  valueFrom: Type.Optional(simplifiedEnvVarSourceSchema),
});

export const envFromSchema = RelaxedObject({
  configMapRef: Type.Optional(configMapEnvSourceSchema),
  prefix: Type.Optional(Type.String()),
});

export const simplifiedContainerSchema = RelaxedObject({
  name: Type.String(),
  args: Type.Optional(Type.Array(Type.String())),
  command: Type.Optional(Type.Array(Type.String())),
  env: Type.Optional(Type.Array(envVarSchema)),
  envFrom: Type.Optional(Type.Array(envFromSchema)),
  image: Type.String(),
  imagePullPolicy: Type.Optional(Type.String()),
});

export type SimplifiedContainer = typebox.Static<
  typeof simplifiedContainerSchema
>;

export const admissionReviewRequestObjectPodSchema = RelaxedObject({
  kind: Type.Literal("Pod"),
  metadata: Type.Optional(RelaxedObject({
    generateName: Type.Optional(Type.String()),
  })),
  spec: RelaxedObject({
    containers: Type.Array(simplifiedContainerSchema),
    initContainers: Type.Optional(Type.Array(simplifiedContainerSchema)),
  }),
});

export type AdmissionReviewRequestObjectPod = typebox.Static<
  typeof admissionReviewRequestObjectPodSchema
>;
