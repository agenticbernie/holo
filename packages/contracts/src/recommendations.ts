import { z } from "@hono/zod-openapi";

export const recommendationWeightsSchema = z.object({
  styleCompatibility: z.number().nonnegative().default(0.25).openapi({ example: 0.25 }),
  audienceCompatibility: z.number().nonnegative().default(0.2).openapi({ example: 0.2 }),
  performance: z.number().nonnegative().default(0.25).openapi({ example: 0.25 }),
  campaignFit: z.number().nonnegative().default(0.15).openapi({ example: 0.15 }),
  semanticCompatibility: z.number().nonnegative().default(0.15).openapi({ example: 0.15 }),
});

export const recommendationRequestSchema = z
  .object({
    skuId: z.string().openapi({ example: "sku_01JEXAMPLE" }),
    campaignId: z.string().optional().openapi({ example: "campaign_01JEXAMPLE" }),
    limit: z.number().int().min(1).max(50).default(10).openapi({ example: 10 }),
    weights: recommendationWeightsSchema.optional(),
  })
  .openapi("RecommendationRequest", { description: "Yêu cầu xếp hạng KOC cho một SKU." });

export const recommendationBreakdownSchema = z.object({
  styleCompatibility: z.number().min(0).max(100).openapi({ example: 80 }),
  audienceCompatibility: z.number().min(0).max(100).openapi({ example: 75 }),
  performance: z.number().min(0).max(100).openapi({ example: 65 }),
  campaignFit: z.number().min(0).max(100).openapi({ example: 70 }),
  semanticCompatibility: z.number().min(0).max(100).openapi({ example: 85 }),
});

export const recommendationSchema = z.object({
  kocId: z.string().openapi({ example: "koc_01JEXAMPLE" }),
  totalScore: z.number().min(0).max(100).openapi({ example: 76.25 }),
  breakdown: recommendationBreakdownSchema,
  explanation: z
    .string()
    .openapi({ example: "KOC này được ưu tiên nhờ phong cách phù hợp (85/100)." }),
});

export const recommendationResponseSchema = z.object({
  skuId: z.string().openapi({ example: "sku_01JEXAMPLE" }),
  campaignId: z.string().nullable().openapi({ example: "campaign_01JEXAMPLE" }),
  items: z.array(recommendationSchema),
});
