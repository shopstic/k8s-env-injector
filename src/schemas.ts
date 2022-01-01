import type { Static } from "./deps/typebox.ts";
import { Type } from "./deps/typebox.ts";

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

export type PatchOperation = Static<typeof PatchOperationSchema>;

export const configMapEnvSourceSchema = Type.PartialObject({
  name: Type.String(),
  optional: Type.Optional(Type.Boolean()),
});

export const configMapKeySelectorSchema = Type.PartialObject({
  key: Type.String(),
  name: Type.String(),
  optional: Type.Optional(Type.Boolean()),
});

export const objectFieldSelectorSchema = Type.PartialObject({
  apiVersion: Type.Optional(Type.String()),
  fieldPath: Type.String(),
});

export const resourceFieldSelectorSchema = Type.PartialObject({
  containerName: Type.String(),
  resource: Type.Optional(Type.String()),
});

export const simplifiedEnvVarSourceSchema = Type.PartialObject({
  configMapKeyRef: Type.Optional(configMapKeySelectorSchema),
  fieldRef: Type.Optional(objectFieldSelectorSchema),
  resourceFieldRef: Type.Optional(resourceFieldSelectorSchema),
});

export const envVarSchema = Type.PartialObject({
  name: Type.String(),
  value: Type.Optional(Type.String()),
  valueFrom: Type.Optional(simplifiedEnvVarSourceSchema),
});

export const envFromSchema = Type.PartialObject({
  configMapRef: Type.Optional(configMapEnvSourceSchema),
  prefix: Type.Optional(Type.String()),
});

export const simplifiedContainerSchema = Type.PartialObject({
  envFrom: Type.Optional(Type.Array(envFromSchema)),
});

export type SimplifiedContainer = Static<
  typeof simplifiedContainerSchema
>;

export const admissionReviewRequestObjectPodSchema = Type.PartialObject({
  kind: Type.Literal("Pod"),
  metadata: Type.Optional(Type.PartialObject({
    generateName: Type.Optional(Type.String()),
  })),
  spec: Type.PartialObject({
    containers: Type.Array(simplifiedContainerSchema),
    initContainers: Type.Optional(Type.Array(Type.Any())),
  }),
});

export type AdmissionReviewRequestObjectPod = Static<
  typeof admissionReviewRequestObjectPodSchema
>;
