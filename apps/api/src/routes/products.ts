import type { ProductApplication } from "@holo/application";
import {
  createProductSchema,
  deletedResponseSchema,
  errorResponseSchema,
  idParamSchema,
  paginationQuerySchema,
  productPageSchema,
  productSchema,
  updateProductSchema,
} from "@holo/contracts";
import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { productResponse } from "../serializers";
import type { HoloEnv } from "../types";

export const registerProductRoutes = (
  app: OpenAPIHono<HoloEnv>,
  products: ProductApplication,
): void => {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v1/products",
      tags: ["Products"],
      operationId: "listProducts",
      summary: "Liệt kê SKU",
      description: "Trả về danh sách SKU có phân trang.",
      request: { query: paginationQuerySchema },
      responses: {
        200: {
          description: "Danh sách SKU.",
          content: { "application/json": { schema: productPageSchema } },
        },
        400: {
          description: "Tham số phân trang không hợp lệ.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => {
      const query = c.req.valid("query");
      const result = await products.list(query.limit, query.offset);
      return c.json(
        {
          items: result.items.map(productResponse),
          meta: { limit: result.limit, offset: result.offset, total: result.total },
        },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v1/products",
      tags: ["Products"],
      operationId: "createProduct",
      summary: "Tạo SKU",
      description: "Tạo một bản ghi SKU mới với dữ liệu đã được kiểm tra.",
      request: { body: { content: { "application/json": { schema: createProductSchema } } } },
      responses: {
        201: {
          description: "SKU đã được tạo.",
          content: { "application/json": { schema: productSchema } },
        },
        400: {
          description: "Dữ liệu SKU không hợp lệ.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => c.json(productResponse(await products.create(c.req.valid("json"))), 201),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v1/products/{id}",
      tags: ["Products"],
      operationId: "getProduct",
      summary: "Xem SKU",
      description: "Lấy thông tin chi tiết của một SKU.",
      request: { params: idParamSchema },
      responses: {
        200: {
          description: "Thông tin SKU.",
          content: { "application/json": { schema: productSchema } },
        },
        404: {
          description: "Không tìm thấy SKU.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => c.json(productResponse(await products.get(c.req.valid("param").id)), 200),
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/api/v1/products/{id}",
      tags: ["Products"],
      operationId: "updateProduct",
      summary: "Cập nhật SKU",
      description: "Cập nhật một phần thông tin SKU.",
      request: {
        params: idParamSchema,
        body: { content: { "application/json": { schema: updateProductSchema } } },
      },
      responses: {
        200: {
          description: "SKU đã được cập nhật.",
          content: { "application/json": { schema: productSchema } },
        },
        400: {
          description: "Dữ liệu cập nhật không hợp lệ.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
        404: {
          description: "Không tìm thấy SKU.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) =>
      c.json(
        productResponse(await products.update(c.req.valid("param").id, c.req.valid("json"))),
        200,
      ),
  );

  app.openapi(
    createRoute({
      method: "delete",
      path: "/api/v1/products/{id}",
      tags: ["Products"],
      operationId: "deleteProduct",
      summary: "Xóa SKU",
      description: "Xóa SKU nếu không còn ràng buộc dữ liệu.",
      request: { params: idParamSchema },
      responses: {
        200: {
          description: "SKU đã được xóa.",
          content: { "application/json": { schema: deletedResponseSchema } },
        },
        404: {
          description: "Không tìm thấy SKU.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => {
      await products.remove(c.req.valid("param").id);
      return c.json({ deleted: true }, 200);
    },
  );
};
