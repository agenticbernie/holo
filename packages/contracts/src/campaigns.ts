import { z } from "@hono/zod-openapi";
import { pageMetaSchema } from "./common";

const campaignStatusSchema = z.enum(["draft", "scheduled", "running", "completed", "cancelled"]);

export const campaignSchema = z
  .object({
    campaignId: z.string().openapi({ example: "campaign_01JEXAMPLE" }),
    name: z.string().openapi({ example: "Summer Minimal 2026" }),
    objective: z.string().openapi({ example: "Tăng nhận diện cho bộ sưu tập hè." }),
    startDate: z.string().date().openapi({ example: "2026-06-01" }),
    endDate: z.string().date().openapi({ example: "2026-07-31" }),
    promotionRate: z.number().min(0).max(1).openapi({ example: 0.15 }),
    season: z.string().openapi({ example: "summer" }),
    status: campaignStatusSchema.openapi({ example: "draft" }),
    budget: z.number().nonnegative().openapi({ example: 50000000 }),
    createdAt: z.string().datetime().openapi({ example: "2026-08-06T08:00:00.000Z" }),
    updatedAt: z.string().datetime().openapi({ example: "2026-08-06T08:00:00.000Z" }),
  })
  .openapi("Campaign", { description: "Chiến dịch quảng bá SKU và mục tiêu triển khai." });

export const createCampaignSchema = campaignSchema
  .omit({ campaignId: true, createdAt: true, updatedAt: true })
  .openapi("CreateCampaignRequest", { description: "Dữ liệu tạo chiến dịch." });

export const updateCampaignSchema = createCampaignSchema
  .partial()
  .openapi("UpdateCampaignRequest", {
    description: "Các trường cần cập nhật của chiến dịch.",
  });

export const campaignResultSchema = z
  .object({
    resultId: z.string().openapi({ example: "result_01JEXAMPLE" }),
    campaignId: z.string().openapi({ example: "campaign_01JEXAMPLE" }),
    skuId: z.string().openapi({ example: "sku_01JEXAMPLE" }),
    kocId: z.string().openapi({ example: "koc_01JEXAMPLE" }),
    views: z.number().int().nonnegative().openapi({ example: 100000 }),
    clicks: z.number().int().nonnegative().openapi({ example: 7500 }),
    orders: z.number().int().nonnegative().openapi({ example: 180 }),
    returns: z.number().int().nonnegative().openapi({ example: 8 }),
    revenue: z.number().nonnegative().openapi({ example: 160200000 }),
    sellingPrice: z.number().positive().openapi({ example: 890000 }),
    stockBefore: z.number().int().nonnegative().openapi({ example: 250 }),
    stockAfter: z.number().int().nonnegative().openapi({ example: 70 }),
    spend: z.number().nonnegative().openapi({ example: 50000000 }),
    roi: z.number().openapi({ example: 2.204 }),
    scenario: z.string().openapi({ example: "successful" }),
    createdAt: z.string().datetime().openapi({ example: "2026-08-06T08:00:00.000Z" }),
  })
  .openapi("CampaignResult", {
    description: "Kết quả mô phỏng hoặc kết quả thực tế của một tương tác.",
  });

export const createCampaignResultSchema = campaignResultSchema
  .omit({ resultId: true, campaignId: true, revenue: true, roi: true, createdAt: true })
  .openapi("CreateCampaignResultRequest", { description: "Dữ liệu kết quả chiến dịch." });

export const campaignPageSchema = z.object({
  items: z.array(campaignSchema),
  meta: pageMetaSchema,
});

export const campaignResultPageSchema = z.object({
  items: z.array(campaignResultSchema),
  meta: pageMetaSchema,
});
