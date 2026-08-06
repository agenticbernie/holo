import { z } from "@hono/zod-openapi";
import { pageMetaSchema } from "./common";

export const audienceProfileSchema = z.object({
  ageRange: z.string().openapi({ example: "25-34" }),
  genders: z.array(z.string()).openapi({ example: ["female"] }),
  regions: z.array(z.string()).openapi({ example: ["HCMC", "Hanoi"] }),
  interests: z.array(z.string()).openapi({ example: ["minimal", "workwear"] }),
});

export const kocSchema = z
  .object({
    kocId: z.string().openapi({ example: "koc_01JEXAMPLE" }),
    displayName: z.string().openapi({ example: "Linh Minimal" }),
    bio: z.string().openapi({ example: "Nội dung thời trang tối giản." }),
    followers: z.number().int().nonnegative().openapi({ example: 85000 }),
    averageViews: z.number().int().nonnegative().openapi({ example: 42000 }),
    engagementRate: z.number().min(0).max(1).openapi({ example: 0.082 }),
    historicalConversionRate: z.number().min(0).max(1).openapi({ example: 0.018 }),
    audienceProfile: audienceProfileSchema,
    styleTags: z
      .array(z.string())
      .min(1)
      .openapi({ example: ["minimal", "workwear"] }),
    isColdStart: z.boolean().openapi({ example: false }),
    createdAt: z.string().datetime().openapi({ example: "2026-08-06T08:00:00.000Z" }),
    updatedAt: z.string().datetime().openapi({ example: "2026-08-06T08:00:00.000Z" }),
  })
  .openapi("Koc", { description: "Thông tin KOC và tín hiệu hiệu suất quan sát được." });

export const createKocSchema = kocSchema
  .omit({ kocId: true, createdAt: true, updatedAt: true })
  .openapi("CreateKocRequest", { description: "Dữ liệu tạo KOC mới." });

export const updateKocSchema = createKocSchema.partial().openapi("UpdateKocRequest", {
  description: "Các trường cần cập nhật của KOC.",
});

export const kocPageSchema = z.object({
  items: z.array(kocSchema),
  meta: pageMetaSchema,
});
