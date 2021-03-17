import { createDefinitionValidator } from "https://raw.githubusercontent.com/shopstic/deno-utils/1.2.0/src/validation-utils.ts";
import { jsonSchema } from "./generated.ts";
import type { V1AdmissionReview } from "./generated.ts";

export const validateV1AdmissionReview = createDefinitionValidator<
  V1AdmissionReview
>({
  schema: jsonSchema,
  definition: "v1.AdmissionReview",
  options: {
    formats: {
      byte: {
        type: "number",
        validate: (x: number) => x >= 0 && x <= 255 && x % 1 == 0,
      },
      int32: {
        type: "number",
        validate: () => true,
      },
      int64: {
        type: "number",
        validate: () => true,
      },
    },
  },
});
