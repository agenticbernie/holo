import type { CampaignApplication } from "@holo/application";
import {
  campaignPageSchema,
  campaignResultPageSchema,
  campaignResultSchema,
  campaignSchema,
  createCampaignResultSchema,
  createCampaignSchema,
  deletedResponseSchema,
  errorResponseSchema,
  idParamSchema,
  paginationQuerySchema,
  updateCampaignSchema,
} from "@holo/contracts";
import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { campaignResponse, campaignResultResponse } from "../serializers";
import type { HoloEnv } from "../types";

export const registerCampaignRoutes = (
  app: OpenAPIHono<HoloEnv>,
  campaigns: CampaignApplication,
): void => {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v1/campaigns",
      tags: ["Campaigns"],
      operationId: "listCampaigns",
      summary: "Liệt kê chiến dịch",
      description: "Trả về danh sách chiến dịch có phân trang.",
      request: { query: paginationQuerySchema },
      responses: {
        200: {
          description: "Danh sách chiến dịch.",
          content: { "application/json": { schema: campaignPageSchema } },
        },
        400: {
          description: "Tham số phân trang không hợp lệ.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => {
      const query = c.req.valid("query");
      const result = await campaigns.list(query.limit, query.offset);
      return c.json(
        {
          items: result.items.map(campaignResponse),
          meta: { limit: result.limit, offset: result.offset, total: result.total },
        },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v1/campaigns",
      tags: ["Campaigns"],
      operationId: "createCampaign",
      summary: "Tạo chiến dịch",
      description: "Tạo chiến dịch với thời gian, ngân sách và tỷ lệ khuyến mãi.",
      request: { body: { content: { "application/json": { schema: createCampaignSchema } } } },
      responses: {
        201: {
          description: "Chiến dịch đã được tạo.",
          content: { "application/json": { schema: campaignSchema } },
        },
        400: {
          description: "Dữ liệu chiến dịch không hợp lệ.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => c.json(campaignResponse(await campaigns.create(c.req.valid("json"))), 201),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v1/campaigns/{id}",
      tags: ["Campaigns"],
      operationId: "getCampaign",
      summary: "Xem chiến dịch",
      description: "Lấy thông tin chi tiết của một chiến dịch.",
      request: { params: idParamSchema },
      responses: {
        200: {
          description: "Thông tin chiến dịch.",
          content: { "application/json": { schema: campaignSchema } },
        },
        404: {
          description: "Không tìm thấy chiến dịch.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => c.json(campaignResponse(await campaigns.get(c.req.valid("param").id)), 200),
  );

  app.openapi(
    createRoute({
      method: "patch",
      path: "/api/v1/campaigns/{id}",
      tags: ["Campaigns"],
      operationId: "updateCampaign",
      summary: "Cập nhật chiến dịch",
      description: "Cập nhật một phần thông tin chiến dịch.",
      request: {
        params: idParamSchema,
        body: { content: { "application/json": { schema: updateCampaignSchema } } },
      },
      responses: {
        200: {
          description: "Chiến dịch đã được cập nhật.",
          content: { "application/json": { schema: campaignSchema } },
        },
        400: {
          description: "Dữ liệu cập nhật không hợp lệ.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
        404: {
          description: "Không tìm thấy chiến dịch.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) =>
      c.json(
        campaignResponse(await campaigns.update(c.req.valid("param").id, c.req.valid("json"))),
        200,
      ),
  );

  app.openapi(
    createRoute({
      method: "delete",
      path: "/api/v1/campaigns/{id}",
      tags: ["Campaigns"],
      operationId: "deleteCampaign",
      summary: "Xóa chiến dịch",
      description: "Xóa chiến dịch và các kết quả liên quan.",
      request: { params: idParamSchema },
      responses: {
        200: {
          description: "Chiến dịch đã được xóa.",
          content: { "application/json": { schema: deletedResponseSchema } },
        },
        404: {
          description: "Không tìm thấy chiến dịch.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => {
      await campaigns.remove(c.req.valid("param").id);
      return c.json({ deleted: true }, 200);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/v1/campaigns/{id}/results",
      tags: ["Campaigns"],
      operationId: "listCampaignResults",
      summary: "Liệt kê kết quả chiến dịch",
      description: "Trả về các kết quả tương tác thuộc một chiến dịch.",
      request: { params: idParamSchema, query: paginationQuerySchema },
      responses: {
        200: {
          description: "Danh sách kết quả.",
          content: { "application/json": { schema: campaignResultPageSchema } },
        },
        404: {
          description: "Không tìm thấy chiến dịch.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => {
      const params = c.req.valid("param");
      const query = c.req.valid("query");
      const result = await campaigns.listResults(params.id, query.limit, query.offset);
      return c.json(
        {
          items: result.items.map(campaignResultResponse),
          meta: { limit: result.limit, offset: result.offset, total: result.total },
        },
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v1/campaigns/{id}/results",
      tags: ["Campaigns"],
      operationId: "createCampaignResult",
      summary: "Ghi nhận kết quả chiến dịch",
      description: "Ghi nhận kết quả với các bất biến views, clicks, orders, tồn kho và doanh thu.",
      request: {
        params: idParamSchema,
        body: { content: { "application/json": { schema: createCampaignResultSchema } } },
      },
      responses: {
        201: {
          description: "Kết quả đã được ghi nhận.",
          content: { "application/json": { schema: campaignResultSchema } },
        },
        400: {
          description: "Kết quả không hợp lệ.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
        404: {
          description: "Không tìm thấy chiến dịch.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => {
      const result = await campaigns.createResult({
        ...c.req.valid("json"),
        campaignId: c.req.valid("param").id,
      });
      return c.json(campaignResultResponse(result), 201);
    },
  );
};
