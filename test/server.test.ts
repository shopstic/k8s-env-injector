import { assertEquals } from "./deps/std-testing.ts";
import { create as createServer } from "../src/server.ts";
import { dirname, fromFileUrl, join } from "./deps/std-path.ts";
import { ListenOptions } from "../src/deps/oak.ts";

const thisPath = dirname(fromFileUrl(import.meta.url));

async function readFixture(fixture: string) {
  return JSON.parse(
    await Deno.readTextFile(
      join(thisPath, "./fixtures/", fixture),
    ),
  );
}

interface TestServerContext {
  hostname: string;
  port: number;
}

async function startServerAndTest(
  test: (ctx: TestServerContext) => Promise<void>,
) {
  const server = createServer({
    webhookExternalBaseUrl: "http://foo.bar",
    defaultConfigMapPrefix: "env-injector",
  });

  const controller = new AbortController();

  const serverOptions: ListenOptions = {
    hostname: "0.0.0.0",
    port: 0,
    signal: controller.signal,
  };

  const listenPromise = new Promise<TestServerContext>((resolve) => {
    server.addEventListener("listen", ({ hostname, port }) => {
      resolve({ hostname, port });
    });
  });
  const serverPromise = server.listen(serverOptions);

  try {
    await test(await listenPromise);
  } finally {
    controller.abort();
    await serverPromise;
  }
}

Deno.test("/healthz should return 200", async () => {
  await startServerAndTest(async (ctx) => {
    const resp = await fetch(`http://${ctx.hostname}:${ctx.port}/healthz`, {
      method: "HEAD",
    });

    assertEquals(resp.status, 200);
  });
});

Deno.test("/mutate should return a correct JSONPatch response", async () => {
  await startServerAndTest(async (ctx) => {
    const requestPayload = await readFixture("mutate/1-request.json");
    const res = await fetch(`http://${ctx.hostname}:${ctx.port}/mutate`, {
      method: "POST",
      body: JSON.stringify(requestPayload),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const body = await res.json();

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
  });
});
