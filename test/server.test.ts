import { describe, it } from "./deps/test-utils.ts";
import { expect, superdeno } from "./deps/superdeno.ts";
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
describe("/healthz", function () {
  it("should return 200", function (done) {
    const app = createServer({
      webhookExternalBaseUrl: "http://foo.bar",
      defaultConfigMapPrefix: "env-injector",
    });

    superdeno(app)
      .head("/healthz")
      .expect(200, done);
  });
});

describe("/mutate", function () {
  it("should return a correct JSONPatch response", async function (done) {
    const app = createServer({
      webhookExternalBaseUrl: "http://foo.bar",
      defaultConfigMapPrefix: "env-injector",
    });
    const requestPayload = await readFixture("mutate/1-request.json");

    superdeno(app)
      .post("/mutate")
      .send(requestPayload)
      .end((_, res) => {
        const body = res.body;

        expect(res.status).toEqual(200);
        expect(body.apiVersion).toEqual("admission.k8s.io/v1");
        expect(body.kind).toEqual("AdmissionReview");
        expect(body.response.uid).toEqual(requestPayload.request.uid);
        expect(body.response.allowed).toBe(true);
        expect(body.response.patchType).toEqual("JSONPatch");

        const patch = JSON.parse(atob(body.response.patch));

        expect(patch.length).toEqual(2);

        expect(patch[0].op).toEqual("add");
        expect(patch[0].path).toEqual("/spec/containers/0/envFrom");

        expect(patch[1].op).toEqual("add");
        expect(patch[1].path).toEqual("/spec/initContainers");

        done();
      });
  });
});

describe("/sync-pod", function () {
  // TODO
});
