import { createProductionDependencies } from "../src/composition";
import { createHttpApp } from "../src/http";

const document = createHttpApp(
  createProductionDependencies({} as Env),
  "test",
).getOpenAPI31Document({
  openapi: "3.1.0",
  info: { title: "Holo API", version: "0.1.0" },
});

const requiredPaths = [
  "/health",
  "/api/v1/products",
  "/api/v1/kocs",
  "/api/v1/campaigns",
  "/api/v1/recommendations",
  "/api/v1/datasets/jobs",
];
if (document.paths === undefined) throw new Error("OpenAPI paths are missing");
for (const path of requiredPaths) {
  if (!(path in document.paths)) throw new Error(`Missing OpenAPI path: ${path}`);
}
if (document.openapi !== "3.1.0") throw new Error("OpenAPI 3.1 document required");
console.log(`OpenAPI validation passed with ${Object.keys(document.paths).length} paths.`);
