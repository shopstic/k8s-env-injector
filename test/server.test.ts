import { assertEquals } from "./deps/std-testing.ts";
import { superoak } from "./deps/superoak.ts";
import { create as createServer } from "../src/server.ts";
import { dirname, fromFileUrl, join } from "./deps/std-path.ts";

const thisPath = dirname(fromFileUrl(import.meta.url));

async function readFixture(fixture: string) {
  return JSON.parse(
    await Deno.readTextFile(
      join(thisPath, "./fixtures/", fixture),
    ),
  );
}

Deno.test("/healthz should return 200", async () => {
  const app = createServer({
    webhookExternalBaseUrl: "http://foo.bar",
    defaultConfigMapPrefix: "env-injector",
  });

  const request = await superoak(app);

  await request
    .head("/healthz")
    .expect(200);
});

Deno.test("/mutate should return a correct JSONPatch response", async () => {
  const app = createServer({
    webhookExternalBaseUrl: "http://foo.bar",
    defaultConfigMapPrefix: "env-injector",
  });

  const requestPayload = await readFixture("mutate/1-request.json");
  const request = await superoak(app);

  return await new Promise((resolve) => {
    request
      .post("/mutate")
      .send(requestPayload)
      .end((_, res) => {
        const body = res.body;

        assertEquals(res.status, 200);
        assertEquals(body.apiVersion, "admission.k8s.io/v1");
        assertEquals(body.kind, "AdmissionReview");
        assertEquals(body.response.uid, requestPayload.request.uid);
        assertEquals(body.response.allowed, true);
        assertEquals(body.response.patchType, "JSONPatch");

        const patch = JSON.parse(atob(body.response.patch));

        assertEquals(patch.length, 2);

        assertEquals(patch[0].op, "add");
        assertEquals(patch[0].path, "/spec/containers/0/envFrom");

        assertEquals(patch[1].op, "add");
        assertEquals(patch[1].path, "/spec/initContainers");
        resolve();
      });
  });
});
