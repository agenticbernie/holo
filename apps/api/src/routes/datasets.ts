import type { DatasetApplication } from "@holo/application";
import {
  createDatasetJobSchema,
  datasetExportQuerySchema,
  datasetJobSchema,
  errorResponseSchema,
  idParamSchema,
} from "@holo/contracts";
import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { datasetJobResponse } from "../serializers";
import type { HoloEnv } from "../types";

export const registerDatasetRoutes = (
  app: OpenAPIHono<HoloEnv>,
  datasets: DatasetApplication,
): void => {
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v1/datasets/jobs",
      tags: ["Datasets"],
      operationId: "createDatasetJob",
      summary: "Tạo job sinh dataset",
      description:
        "Đưa yêu cầu sinh dataset vào Cloudflare Queue và trả về ngay trạng thái queued.",
      request: { body: { content: { "application/json": { schema: createDatasetJobSchema } } } },
      responses: {
        202: {
          description: "Job đã vào hàng đợi.",
          content: { "application/json": { schema: datasetJobSchema } },
        },
        400: {
          description: "Tham số dataset không hợp lệ.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
        503: {
          description: "Queue tạm thời không khả dụng.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const job = await datasets.start(body.parameters, c.get("requestId"));
      return c.json(datasetJobResponse(job), 202);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v1/datasets/jobs/{id}",
      tags: ["Datasets"],
      operationId: "getDatasetJob",
      summary: "Xem trạng thái dataset",
      description: "Lấy trạng thái, tham số, cảnh báo fallback và artifact của job sinh dataset.",
      request: { params: idParamSchema },
      responses: {
        200: {
          description: "Trạng thái job.",
          content: { "application/json": { schema: datasetJobSchema } },
        },
        404: {
          description: "Không tìm thấy job.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => c.json(datasetJobResponse(await datasets.get(c.req.valid("param").id)), 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v1/datasets/jobs/{id}/export",
      tags: ["Datasets"],
      operationId: "exportDataset",
      summary: "Tải artifact dataset",
      description: "Trả về artifact JSON, JSONL hoặc CSV của dataset đã hoàn tất.",
      request: { params: idParamSchema, query: datasetExportQuerySchema },
      responses: {
        200: {
          description: "Artifact dataset.",
          content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } },
        },
        404: {
          description: "Không tìm thấy job hoặc artifact.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
        409: {
          description: "Dataset chưa hoàn tất.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => {
      const artifact = await datasets.artifact(
        c.req.valid("param").id,
        c.req.valid("query").format,
      );
      if (artifact === null)
        return c.json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Artifact không tồn tại.",
              requestId: c.get("requestId"),
            },
          },
          404,
        );
      if (artifact.contentType !== null) c.header("Content-Type", artifact.contentType);
      c.header(
        "Content-Disposition",
        `attachment; filename="${artifact.key.split("/").pop() ?? "dataset"}"`,
      );
      return c.body(artifact.body);
    },
  );
};
