import { OpenAPIHono } from "@hono/zod-openapi";
import { healthResponseSchema } from "@pipa/contracts";
import { DomainError, InfrastructureError } from "@pipa/domain";
import { apiReference } from "@scalar/hono-api-reference";
import type { MiddlewareHandler } from "hono";
import { stringify as stringifyYaml } from "yaml";
import { registerCampaignRoutes } from "./routes/campaigns";
import { registerDatasetRoutes } from "./routes/datasets";
import { registerKocRoutes } from "./routes/kocs";
import { registerProductRoutes } from "./routes/products";
import { registerRecommendationRoutes } from "./routes/recommendations";
import type { AppDependencies, PipaEnv } from "./types";

const openApiInfo = {
  openapi: "3.1.0" as const,
  info: {
    title: "Pipa API",
    version: "0.1.0",
    description: "API backend cho nền tảng đề xuất SKU-KOC và sinh dataset thời trang.",
  },
  servers: [{ url: "/", description: "Môi trường hiện tại" }],
};

const errorResponse = (
  requestId: string,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) => ({
  error: { code, message, ...(details === undefined ? {} : { details }), requestId },
});

const requestIdMiddleware: MiddlewareHandler<PipaEnv> = async (c, next): Promise<void> => {
  const incoming = c.req.header("X-Request-ID");
  const requestId =
    incoming !== undefined && /^[a-zA-Z0-9._-]{1,100}$/.test(incoming)
      ? incoming
      : `req_${crypto.randomUUID()}`;
  c.set("requestId", requestId);
  c.header("X-Request-ID", requestId);
  const startedAt = Date.now();
  await next();
  console.log(
    JSON.stringify({
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    }),
  );
};

export const createHttpApp = (
  dependencies: AppDependencies,
  environment: string,
): OpenAPIHono<PipaEnv> => {
  const app = new OpenAPIHono<PipaEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          errorResponse(c.get("requestId"), "VALIDATION_ERROR", "Dữ liệu yêu cầu không hợp lệ.", {
            issues: result.error.issues,
          }),
          400,
        );
      }
    },
  });
  app.use("*", requestIdMiddleware);
  app.onError((error, c) => {
    const requestId = c.get("requestId");
    if (error instanceof DomainError) {
      const status = error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : 400;
      return c.json(errorResponse(requestId, error.code, error.message, error.details), status);
    }
    if (error instanceof InfrastructureError) {
      console.error(
        JSON.stringify({
          requestId,
          error: error.message,
          code: error.code,
          details: error.details,
        }),
      );
      return c.json(
        errorResponse(requestId, error.code, "Dịch vụ lưu trữ tạm thời không khả dụng."),
        503,
      );
    }
    console.error(
      JSON.stringify({ requestId, error: error instanceof Error ? error.message : String(error) }),
    );
    return c.json(
      errorResponse(requestId, "INTERNAL_ERROR", "Đã xảy ra lỗi không mong muốn."),
      500,
    );
  });
  app.notFound((c) =>
    c.json(errorResponse(c.get("requestId"), "NOT_FOUND", "Endpoint không tồn tại."), 404),
  );

  app.openapi(
    {
      method: "get",
      path: "/health",
      tags: ["System"],
      operationId: "getHealth",
      summary: "Kiểm tra trạng thái API",
      description: "Trả về trạng thái hoạt động cơ bản của Pipa API.",
      responses: {
        200: {
          description: "API đang hoạt động.",
          content: { "application/json": { schema: healthResponseSchema } },
        },
      },
    },
    (c) =>
      c.json(
        { status: "ok", service: "pipa-api", environment, requestId: c.get("requestId") },
        200,
      ),
  );

  registerProductRoutes(app, dependencies.products);
  registerKocRoutes(app, dependencies.kocs);
  registerCampaignRoutes(app, dependencies.campaigns);
  registerRecommendationRoutes(app, dependencies.recommendations);
  registerDatasetRoutes(app, dependencies.datasets);

  app.doc31("/docs/openapi.json", openApiInfo);
  app.get("/docs/openapi", (c) => c.json(app.getOpenAPI31Document(openApiInfo)));
  app.get("/docs/openapi.yaml", (c) => {
    c.header("Content-Type", "application/yaml; charset=utf-8");
    return c.body(stringifyYaml(app.getOpenAPI31Document(openApiInfo)));
  });
  app.get(
    "/docs",
    apiReference({
      url: "/docs/openapi.json",
      pageTitle: "Pipa API Documentation",
    }),
  );
  return app;
};
