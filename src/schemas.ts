import { typebox } from "./deps.ts";

const Type = typebox.Type;

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

export const configMapEnvSourceJsonSchema = Type.Object({
  name: Type.String(),
  optional: Type.Optional(Type.Boolean()),
});

export const configMapKeySelectorJsonSchema = Type.Object({
  key: Type.String(),
  name: Type.String(),
  optional: Type.Optional(Type.Boolean()),
});

export const objectFieldSelectorJsonSchema = Type.Object({
  apiVersion: Type.Optional(Type.String()),
  fieldPath: Type.String(),
});

export const resourceFieldSelectorJsonSchema = Type.Object({
  containerName: Type.String(),
  resource: Type.Optional(Type.String()),
});

export const simplifiedEnvVarSourceJsonSchema = Type.Object({
  configMapKeyRef: Type.Optional(configMapKeySelectorJsonSchema),
  fieldRef: Type.Optional(objectFieldSelectorJsonSchema),
  resourceFieldRef: Type.Optional(resourceFieldSelectorJsonSchema),
});

export const envVarJsonSchema = Type.Object({
  name: Type.String(),
  value: Type.Optional(Type.String()),
  valueFrom: Type.Optional(simplifiedEnvVarSourceJsonSchema),
});

export const envFromJsonSchema = Type.Object({
  configMapRef: Type.Optional(configMapEnvSourceJsonSchema),
  prefix: Type.Optional(Type.String()),
});

export const simplifiedContainerJsonSchema = Type.Object({
  name: Type.String(),
  args: Type.Optional(Type.Array(Type.String)),
  command: Type.Optional(Type.Array(Type.String)),
  env: Type.Optional(Type.Array(envVarJsonSchema)),
  envFrom: Type.Optional(Type.Array(envFromJsonSchema)),
  image: Type.String(),
  imagePullPolicy: Type.Optional(Type.String()),
});

export type SimplifiedContainer = typebox.Static<
  typeof simplifiedContainerJsonSchema
>;

export const simplifiedPodJsonSchema = Type.Object({
  kind: Type.Literal("Pod"),
  spec: Type.Object({
    containers: Type.Array(simplifiedContainerJsonSchema),
    initContainers: Type.Optional(Type.Array(simplifiedContainerJsonSchema)),
  }),
});

export type SimplifiedPod = typebox.Static<typeof simplifiedPodJsonSchema>;
