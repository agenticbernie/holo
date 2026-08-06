import { z } from "@hono/zod-openapi";
import { pageMetaSchema } from "./common";

const productCategorySchema = z.enum([
  "dress",
  "top",
  "bottom",
  "outerwear",
  "accessory",
  "footwear",
]);

export const productSchema = z
  .object({
    skuId: z.string().openapi({ example: "sku_01JEXAMPLE" }),
    name: z.string().openapi({ example: "Váy lụa midi thanh lịch" }),
    description: z.string().openapi({ example: "Thiết kế nhẹ, phù hợp cho mùa hè." }),
    category: productCategorySchema.openapi({ example: "dress" }),
    brand: z.string().openapi({ example: "Pipa Studio" }),
    sellingPrice: z.number().positive().openapi({ example: 890000 }),
    stock: z.number().int().nonnegative().openapi({ example: 120 }),
    styleTags: z
      .array(z.string())
      .min(1)
      .openapi({ example: ["minimal", "summer"] }),
    targetAudience: z
      .array(z.string())
      .min(1)
      .openapi({ example: ["women-25-34", "urban"] }),
    createdAt: z.string().datetime().openapi({ example: "2026-08-06T08:00:00.000Z" }),
    updatedAt: z.string().datetime().openapi({ example: "2026-08-06T08:00:00.000Z" }),
  })
  .openapi("Product", { description: "Một bản ghi sản phẩm đại diện cho một SKU có thể bán." });

export const createProductSchema = productSchema
  .omit({ skuId: true, createdAt: true, updatedAt: true })
  .openapi("CreateProductRequest", { description: "Dữ liệu tạo SKU mới." });

export const updateProductSchema = createProductSchema.partial().openapi("UpdateProductRequest", {
  description: "Các trường cần cập nhật của SKU.",
});

export const productPageSchema = z.object({
  items: z.array(productSchema),
  meta: pageMetaSchema,
});
