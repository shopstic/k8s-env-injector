const { compile } = require("json-schema-to-typescript");
const toJsonSchema = require("@openapi-contrib/openapi-schema-to-json-schema");
const { execSync } = require("child_process");
const fs = require("fs");
const migrate = require("json-schema-migrate");

async function main() {
  const stdin = fs.readFileSync(0, "utf8");
  const swagger = JSON.parse(stdin);
  const schema = toJsonSchema(swagger);

  const types = await compile(schema, "", {
    unreachableDefinitions: true,
    bannerComment: "",
  });
  migrate.draft7(schema);

  schema.definitions["v1.AdmissionRequest"].properties.oldObject.nullable =
    true;

  const migratedSchema = {
    definitions: schema.definitions,
    "$schema": schema["$schema"],
  };

  const formatted = execSync("deno fmt -", {
    input: `${types}
    
export const jsonSchema = ${
      JSON.stringify(
        migratedSchema,
        null,
        2,
      )
    }`,
    encoding: "utf8",
  });

  console.log(formatted);
}

main().catch((e) => {
  throw e;
});
