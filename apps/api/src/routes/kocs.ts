import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import type { KocApplication } from "@pipa/application";
import {
  createKocSchema,
  deletedResponseSchema,
  errorResponseSchema,
  idParamSchema,
  kocPageSchema,
  kocSchema,
  paginationQuerySchema,
  updateKocSchema,
} from "@pipa/contracts";
import { kocResponse } from "../serializers";
import type { PipaEnv } from "../types";

export const registerKocRoutes = (app: OpenAPIHono<PipaEnv>, kocs: KocApplication): void => {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v1/kocs",
      tags: ["KOCs"],
      operationId: "listKocs",
      summary: "Liệt kê KOC",
      description: "Trả về danh sách KOC có phân trang.",
      request: { query: paginationQuerySchema },
      responses: {
        200: {
          description: "Danh sách KOC.",
          content: { "application/json": { schema: kocPageSchema } },
        },
        400: {
          description: "Tham số phân trang không hợp lệ.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => {
      const query = c.req.valid("query");
      const result = await kocs.list(query.limit, query.offset);
      return c.json(
        {
          items: result.items.map(kocResponse),
          meta: { limit: result.limit, offset: result.offset, total: result.total },
        },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v1/kocs",
      tags: ["KOCs"],
      operationId: "createKoc",
      summary: "Tạo KOC",
      description: "Tạo một hồ sơ KOC với tín hiệu hiệu suất quan sát được.",
      request: { body: { content: { "application/json": { schema: createKocSchema } } } },
      responses: {
        201: {
          description: "KOC đã được tạo.",
          content: { "application/json": { schema: kocSchema } },
        },
        400: {
          description: "Dữ liệu KOC không hợp lệ.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => c.json(kocResponse(await kocs.create(c.req.valid("json"))), 201),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v1/kocs/{id}",
      tags: ["KOCs"],
      operationId: "getKoc",
      summary: "Xem KOC",
      description: "Lấy thông tin chi tiết của một KOC.",
      request: { params: idParamSchema },
      responses: {
        200: {
          description: "Thông tin KOC.",
          content: { "application/json": { schema: kocSchema } },
        },
        404: {
          description: "Không tìm thấy KOC.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => c.json(kocResponse(await kocs.get(c.req.valid("param").id)), 200),
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/api/v1/kocs/{id}",
      tags: ["KOCs"],
      operationId: "updateKoc",
      summary: "Cập nhật KOC",
      description: "Cập nhật một phần thông tin KOC.",
      request: {
        params: idParamSchema,
        body: { content: { "application/json": { schema: updateKocSchema } } },
      },
      responses: {
        200: {
          description: "KOC đã được cập nhật.",
          content: { "application/json": { schema: kocSchema } },
        },
        400: {
          description: "Dữ liệu cập nhật không hợp lệ.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
        404: {
          description: "Không tìm thấy KOC.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) =>
      c.json(kocResponse(await kocs.update(c.req.valid("param").id, c.req.valid("json"))), 200),
  );

  app.openapi(
    createRoute({
      method: "delete",
      path: "/api/v1/kocs/{id}",
      tags: ["KOCs"],
      operationId: "deleteKoc",
      summary: "Xóa KOC",
      description: "Xóa hồ sơ KOC nếu không còn ràng buộc dữ liệu.",
      request: { params: idParamSchema },
      responses: {
        200: {
          description: "KOC đã được xóa.",
          content: { "application/json": { schema: deletedResponseSchema } },
        },
        404: {
          description: "Không tìm thấy KOC.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => {
      await kocs.remove(c.req.valid("param").id);
      return c.json({ deleted: true }, 200);
    },
  );
};
