import type { RecommendationApplication } from "@holo/application";
import {
  errorResponseSchema,
  recommendationRequestSchema,
  recommendationResponseSchema,
} from "@holo/contracts";
import { defaultRecommendationWeights } from "@holo/domain";
import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";
import { recommendationResponse } from "../serializers";
import type { HoloEnv } from "../types";

export const registerRecommendationRoutes = (
  app: OpenAPIHono<HoloEnv>,
  recommendations: RecommendationApplication,
): void => {
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/v1/recommendations",
      tags: ["Recommendations"],
      operationId: "recommendKocsForSku",
      summary: "Xếp hạng KOC cho SKU",
      description:
        "Xếp hạng KOC bằng bộ điểm tất định, giải thích được và có hỗ trợ KOC cold-start.",
      request: {
        body: { content: { "application/json": { schema: recommendationRequestSchema } } },
      },
      responses: {
        200: {
          description: "Danh sách KOC đã xếp hạng.",
          content: { "application/json": { schema: recommendationResponseSchema } },
        },
        400: {
          description: "Yêu cầu đề xuất không hợp lệ.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
        404: {
          description: "Không tìm thấy SKU hoặc chiến dịch.",
          content: { "application/json": { schema: errorResponseSchema } },
        },
      },
    }),
    async (c) => {
      const body = c.req.valid("json");
      const input = {
        skuId: body.skuId,
        limit: body.limit,
        ...(body.campaignId === undefined ? {} : { campaignId: body.campaignId }),
        ...(body.weights === undefined
          ? {}
          : { weights: { ...defaultRecommendationWeights, ...body.weights } }),
      };
      const items = await recommendations.recommend(input);
      return c.json(
        {
          skuId: body.skuId,
          campaignId: body.campaignId ?? null,
          items: items.map(recommendationResponse),
        },
        200,
      );
    },
  );
};
