import { z } from "@hono/zod-openapi";

export const idParamSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .openapi({ param: { name: "id", in: "path" }, example: "sku_123" }),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(250).default(50).openapi({ example: 50 }),
  offset: z.coerce.number().int().min(0).default(0).openapi({ example: 0 }),
});

export const errorResponseSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: "VALIDATION_ERROR" }),
      message: z.string().openapi({ example: "Dữ liệu yêu cầu không hợp lệ." }),
      details: z.record(z.string(), z.unknown()).optional(),
      requestId: z.string().openapi({ example: "req_01JEXAMPLE" }),
    }),
  })
  .openapi("ErrorResponse", {
    description: "Cấu trúc lỗi thống nhất của Pipa.",
  });

export const deletedResponseSchema = z.object({
  deleted: z.boolean().openapi({ example: true }),
});

export const pageMetaSchema = z.object({
  limit: z.number().int().openapi({ example: 50 }),
  offset: z.number().int().openapi({ example: 0 }),
  total: z.number().int().openapi({ example: 1 }),
});

export const healthResponseSchema = z.object({
  status: z.literal("ok").openapi({ example: "ok" }),
  service: z.literal("pipa-api").openapi({ example: "pipa-api" }),
  environment: z.string().openapi({ example: "development" }),
  requestId: z.string().openapi({ example: "req_01JEXAMPLE" }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
