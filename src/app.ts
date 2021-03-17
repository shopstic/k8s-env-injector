import { loggerWithContext } from "./logger.ts";
import { opine } from "https://deno.land/x/opine@1.2.0/mod.ts";
import { validateV1AdmissionReview } from "./validation.ts";

const logger = loggerWithContext("main");

const serverInterface = "0.0.0.0";
const serverPort = 8080;

opine()
  .get("/", (req, res) => {
    logger.info(
      "Got request",
      Array
        .from(req.headers.entries()).map(([key, value]) => `${key}=${value}`)
        .join(" "),
      req.parsedBody,
    );
    res.send("Hello World");
  })
  .post("/mutate", (req, res) => {
    const admissionReview = validateV1AdmissionReview(req.parsedBody);

    console.log("admissionReview", admissionReview);

    res.setStatus(400).send("TBD");
  })
  .listen(`${serverInterface}:${serverPort}`);

logger.info(
  `Pod annotation Admission Controller started at ${serverInterface}:${serverPort}`,
);
