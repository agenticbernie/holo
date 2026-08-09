import { z } from "zod";

const productCategorySchema = z.enum([
  "dress",
  "top",
  "bottom",
  "outerwear",
  "accessory",
  "footwear",
]);
const campaignStatusSchema = z.enum(["draft", "scheduled", "running", "completed", "cancelled"]);

export const productSchema = z.object({
  skuId: z.string(),
  name: z.string(),
  description: z.string(),
  category: productCategorySchema,
  brand: z.string(),
  sellingPrice: z.number(),
  stock: z.number().int(),
  styleTags: z.array(z.string()),
  targetAudience: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const kocSchema = z.object({
  kocId: z.string(),
  displayName: z.string(),
  bio: z.string(),
  followers: z.number().int(),
  averageViews: z.number().int(),
  engagementRate: z.number(),
  historicalConversionRate: z.number(),
  audienceProfile: z.object({
    ageRange: z.string(),
    genders: z.array(z.string()),
    regions: z.array(z.string()),
    interests: z.array(z.string()),
  }),
  styleTags: z.array(z.string()),
  isColdStart: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const campaignSchema = z.object({
  campaignId: z.string(),
  name: z.string(),
  objective: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  promotionRate: z.number(),
  season: z.string(),
  status: campaignStatusSchema,
  budget: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const campaignResultSchema = z.object({
  resultId: z.string(),
  campaignId: z.string(),
  skuId: z.string(),
  kocId: z.string(),
  views: z.number().int(),
  clicks: z.number().int(),
  orders: z.number().int(),
  returns: z.number().int(),
  revenue: z.number(),
  sellingPrice: z.number(),
  stockBefore: z.number().int(),
  stockAfter: z.number().int(),
  spend: z.number(),
  roi: z.number(),
  scenario: z.string(),
  createdAt: z.string(),
});

const page = <T extends z.ZodType>(schema: T) =>
  z.object({
    items: z.array(schema),
    meta: z.object({ limit: z.number(), offset: z.number(), total: z.number() }),
  });

export const productPageSchema = page(productSchema);
export const kocPageSchema = page(kocSchema);
export const campaignPageSchema = page(campaignSchema);
export const campaignResultPageSchema = page(campaignResultSchema);

export const recommendationSchema = z.object({
  kocId: z.string(),
  totalScore: z.number(),
  breakdown: z.record(z.string(), z.number()),
  explanation: z.string(),
});

export const recommendationResponseSchema = z.object({
  skuId: z.string(),
  campaignId: z.string().nullable(),
  items: z.array(recommendationSchema),
});

export const datasetJobSchema = z.object({
  jobId: z.string(),
  status: z.enum(["queued", "running", "completed", "failed"]),
  parameters: z.object({
    products: z.number().int(),
    kocs: z.number().int(),
    campaigns: z.number().int(),
    interactions: z.number().int(),
    coldStartRate: z.number(),
    seed: z.number().int(),
  }),
  fallbackUsed: z.boolean(),
  warnings: z.array(
    z.object({
      code: z.string(),
      stage: z.string(),
      fallbackStrategy: z.string(),
      timestamp: z.string(),
      requestId: z.string(),
    }),
  ),
  artifactKey: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  environment: z.string(),
  requestId: z.string(),
});

export const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string(),
  }),
});

export type Product = z.infer<typeof productSchema>;
export type Koc = z.infer<typeof kocSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type CampaignResult = z.infer<typeof campaignResultSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;
export type DatasetJob = z.infer<typeof datasetJobSchema>;
export type DatasetParameters = DatasetJob["parameters"];
export type ProductInput = Omit<Product, "skuId" | "createdAt" | "updatedAt">;
export type KocInput = Omit<Koc, "kocId" | "createdAt" | "updatedAt">;
export type CampaignInput = Omit<Campaign, "campaignId" | "createdAt" | "updatedAt">;
export type CampaignResultInput = Omit<
  CampaignResult,
  "resultId" | "campaignId" | "revenue" | "roi" | "createdAt"
>;
export type Page<T> = { items: T[]; meta: { limit: number; offset: number; total: number } };

export class HoloApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly details: Record<string, unknown> | undefined;

  constructor(status: number, body: z.infer<typeof errorSchema> | null) {
    super(body?.error.message ?? "Không thể kết nối với Holo API.");
    this.name = "HoloApiError";
    this.status = status;
    this.code = body?.error.code ?? "NETWORK_ERROR";
    this.requestId = body?.error.requestId ?? null;
    this.details = body?.error.details;
  }
}

const parseError = async (response: Response): Promise<z.infer<typeof errorSchema> | null> => {
  try {
    return errorSchema.parse(await response.json());
  } catch {
    return null;
  }
};

export const createHoloApiClient = (baseUrl = "https://holo-api.hackonteam.workers.dev") => {
  const request = async <T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> => {
    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
      });
    } catch {
      throw new HoloApiError(0, null);
    }
    if (!response.ok) throw new HoloApiError(response.status, await parseError(response));
    if (response.status === 204) return undefined as T;
    return schema.parse(await response.json());
  };

  const json = (value: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(value) });
  const patch = (value: unknown): RequestInit => ({ method: "PATCH", body: JSON.stringify(value) });

  return {
    health: () => request("/health", healthSchema),
    listProducts: (limit = 50, offset = 0) =>
      request(`/api/v1/products?limit=${limit}&offset=${offset}`, productPageSchema),
    getProduct: (id: string) =>
      request(`/api/v1/products/${encodeURIComponent(id)}`, productSchema),
    createProduct: (value: ProductInput) => request("/api/v1/products", productSchema, json(value)),
    updateProduct: (id: string, value: Partial<ProductInput>) =>
      request(`/api/v1/products/${encodeURIComponent(id)}`, productSchema, patch(value)),
    deleteProduct: (id: string) =>
      request(`/api/v1/products/${encodeURIComponent(id)}`, z.object({ deleted: z.boolean() }), {
        method: "DELETE",
      }),
    listKocs: (limit = 250, offset = 0) =>
      request(`/api/v1/kocs?limit=${limit}&offset=${offset}`, kocPageSchema),
    getKoc: (id: string) => request(`/api/v1/kocs/${encodeURIComponent(id)}`, kocSchema),
    createKoc: (value: KocInput) => request("/api/v1/kocs", kocSchema, json(value)),
    updateKoc: (id: string, value: Partial<KocInput>) =>
      request(`/api/v1/kocs/${encodeURIComponent(id)}`, kocSchema, patch(value)),
    deleteKoc: (id: string) =>
      request(`/api/v1/kocs/${encodeURIComponent(id)}`, z.object({ deleted: z.boolean() }), {
        method: "DELETE",
      }),
    listCampaigns: (limit = 250, offset = 0) =>
      request(`/api/v1/campaigns?limit=${limit}&offset=${offset}`, campaignPageSchema),
    getCampaign: (id: string) =>
      request(`/api/v1/campaigns/${encodeURIComponent(id)}`, campaignSchema),
    createCampaign: (value: CampaignInput) =>
      request("/api/v1/campaigns", campaignSchema, json(value)),
    updateCampaign: (id: string, value: Partial<CampaignInput>) =>
      request(`/api/v1/campaigns/${encodeURIComponent(id)}`, campaignSchema, patch(value)),
    deleteCampaign: (id: string) =>
      request(`/api/v1/campaigns/${encodeURIComponent(id)}`, z.object({ deleted: z.boolean() }), {
        method: "DELETE",
      }),
    listCampaignResults: (id: string, limit = 250, offset = 0) =>
      request(
        `/api/v1/campaigns/${encodeURIComponent(id)}/results?limit=${limit}&offset=${offset}`,
        campaignResultPageSchema,
      ),
    createCampaignResult: (id: string, value: CampaignResultInput) =>
      request(
        `/api/v1/campaigns/${encodeURIComponent(id)}/results`,
        campaignResultSchema,
        json(value),
      ),
    recommend: (value: {
      skuId: string;
      campaignId?: string;
      limit?: number;
      weights?: Record<string, number>;
    }) => request("/api/v1/recommendations", recommendationResponseSchema, json(value)),
    createDatasetJob: (parameters?: Partial<DatasetParameters>) =>
      request(
        "/api/v1/datasets/jobs",
        datasetJobSchema,
        json(parameters === undefined ? {} : { parameters }),
      ),
    getDatasetJob: (id: string) =>
      request(`/api/v1/datasets/jobs/${encodeURIComponent(id)}`, datasetJobSchema),
    datasetExportUrl: (id: string, format: "json" | "jsonl" | "csv") =>
      `${baseUrl.replace(/\/$/, "")}/api/v1/datasets/jobs/${encodeURIComponent(id)}/export?format=${format}`,
  };
};

export type HoloApiClient = ReturnType<typeof createHoloApiClient>;
