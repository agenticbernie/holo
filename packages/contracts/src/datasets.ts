import { z } from "@hono/zod-openapi";

export const datasetParametersSchema = z.object({
  products: z.number().int().min(1).max(500).default(200).openapi({ example: 200 }),
  kocs: z.number().int().min(1).max(250).default(80).openapi({ example: 80 }),
  campaigns: z.number().int().min(1).max(1000).default(200).openapi({ example: 200 }),
  interactions: z.number().int().min(100).max(20000).default(3000).openapi({ example: 3000 }),
  coldStartRate: z.number().min(0).max(0.5).default(0.25).openapi({ example: 0.25 }),
  seed: z.number().int().default(20260806).openapi({ example: 20260806 }),
});

export const createDatasetJobSchema = z
  .object({
    parameters: datasetParametersSchema.partial().optional(),
  })
  .openapi("CreateDatasetJobRequest", { description: "Tham số tạo dataset mô phỏng." });

export const datasetWarningSchema = z.object({
  code: z.string().openapi({ example: "KIMI_FALLBACK" }),
  stage: z.string().openapi({ example: "product_semantics" }),
  fallbackStrategy: z.string().openapi({ example: "deterministic_template" }),
  timestamp: z.string().datetime().openapi({ example: "2026-08-06T08:00:00.000Z" }),
  requestId: z.string().openapi({ example: "req_01JEXAMPLE" }),
});

export const datasetJobSchema = z.object({
  jobId: z.string().openapi({ example: "dataset_01JEXAMPLE" }),
  status: z.enum(["queued", "running", "completed", "failed"]).openapi({ example: "queued" }),
  parameters: datasetParametersSchema,
  fallbackUsed: z.boolean().openapi({ example: false }),
  warnings: z.array(datasetWarningSchema),
  artifactKey: z.string().nullable().openapi({ example: "datasets/dataset_01JEXAMPLE.jsonl" }),
  errorMessage: z.string().nullable().openapi({ example: null }),
  createdAt: z.string().datetime().openapi({ example: "2026-08-06T08:00:00.000Z" }),
  updatedAt: z.string().datetime().openapi({ example: "2026-08-06T08:00:00.000Z" }),
});

export const datasetExportQuerySchema = z.object({
  format: z.enum(["json", "jsonl", "csv"]).default("json").openapi({ example: "jsonl" }),
});
