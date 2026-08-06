import type { D1Database } from "@cloudflare/workers-types";
import {
  type Campaign,
  type CampaignRepository,
  type CampaignResult,
  type CampaignResultRepository,
  type DatasetJob,
  type DatasetJobRepository,
  InfrastructureError,
  type Koc,
  type KocRepository,
  type Page,
  type PageRequest,
  type Product,
  type ProductRepository,
  type UpdateCampaignInput,
} from "@pipa/domain";
import { parseAudienceProfile, parseWarnings, serializeStringArray } from "./serialization";

const databaseError = (operation: string, cause: unknown): InfrastructureError =>
  new InfrastructureError("DATABASE_ERROR", `D1 operation failed: ${operation}`, {
    cause: cause instanceof Error ? cause.message : String(cause),
  });

const page = async <T>(
  db: D1Database,
  query: string,
  countQuery: string,
  request: PageRequest,
  values: readonly unknown[] = [],
): Promise<Page<T>> => {
  try {
    const [rows, count] = await Promise.all([
      db
        .prepare(query)
        .bind(...values, request.limit, request.offset)
        .all<T>(),
      db
        .prepare(countQuery)
        .bind(...values)
        .first<{ total: number }>(),
    ]);
    return {
      items: rows.results,
      limit: request.limit,
      offset: request.offset,
      total: count?.total ?? 0,
    };
  } catch (error) {
    throw databaseError("page", error);
  }
};

interface ProductRow {
  sku_id: string;
  name: string;
  description: string;
  category: Product["category"];
  brand: string;
  selling_price: number;
  stock: number;
  style_tags_json: string;
  target_audience_json: string;
  created_at: string;
  updated_at: string;
}

const toProduct = (row: ProductRow): Product => ({
  skuId: row.sku_id,
  name: row.name,
  description: row.description,
  category: row.category,
  brand: row.brand,
  sellingPrice: row.selling_price,
  stock: row.stock,
  styleTags: parseWarnings<string>(row.style_tags_json),
  targetAudience: parseWarnings<string>(row.target_audience_json),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createProductRepository = (db: D1Database): ProductRepository => ({
  list: async (request) => {
    const result = await page<ProductRow>(
      db,
      "SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?",
      "SELECT COUNT(*) AS total FROM products",
      request,
    );
    return { ...result, items: result.items.map(toProduct) };
  },
  getById: async (skuId) => {
    try {
      const row = await db
        .prepare("SELECT * FROM products WHERE sku_id = ?1")
        .bind(skuId)
        .first<ProductRow>();
      return row === null ? null : toProduct(row);
    } catch (error) {
      throw databaseError("get product", error);
    }
  },
  create: async (product) => {
    try {
      await db
        .prepare(
          "INSERT INTO products (sku_id, name, description, category, brand, selling_price, stock, style_tags_json, target_audience_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          product.skuId,
          product.name,
          product.description,
          product.category,
          product.brand,
          product.sellingPrice,
          product.stock,
          serializeStringArray(product.styleTags),
          serializeStringArray(product.targetAudience),
          product.createdAt,
          product.updatedAt,
        )
        .run();
      return product;
    } catch (error) {
      throw databaseError("create product", error);
    }
  },
  update: async (skuId, input, updatedAt) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    const add = (field: string, value: unknown): void => {
      fields.push(`${field} = ?`);
      values.push(value);
    };
    if (input.name !== undefined) add("name", input.name);
    if (input.description !== undefined) add("description", input.description);
    if (input.category !== undefined) add("category", input.category);
    if (input.brand !== undefined) add("brand", input.brand);
    if (input.sellingPrice !== undefined) add("selling_price", input.sellingPrice);
    if (input.stock !== undefined) add("stock", input.stock);
    if (input.styleTags !== undefined)
      add("style_tags_json", serializeStringArray(input.styleTags));
    if (input.targetAudience !== undefined)
      add("target_audience_json", serializeStringArray(input.targetAudience));
    add("updated_at", updatedAt);
    try {
      const result = await db
        .prepare(`UPDATE products SET ${fields.join(", ")} WHERE sku_id = ?`)
        .bind(...values, skuId)
        .run();
      if (result.meta.changes === 0) return null;
      const row = await db
        .prepare("SELECT * FROM products WHERE sku_id = ?1")
        .bind(skuId)
        .first<ProductRow>();
      return row === null ? null : toProduct(row);
    } catch (error) {
      throw databaseError("update product", error);
    }
  },
  delete: async (skuId) => {
    try {
      const result = await db.prepare("DELETE FROM products WHERE sku_id = ?1").bind(skuId).run();
      return result.meta.changes > 0;
    } catch (error) {
      throw databaseError("delete product", error);
    }
  },
});

interface KocRow {
  koc_id: string;
  display_name: string;
  bio: string;
  followers: number;
  average_views: number;
  engagement_rate: number;
  historical_conversion_rate: number;
  audience_profile_json: string;
  style_tags_json: string;
  is_cold_start: number;
  created_at: string;
  updated_at: string;
}

const toKoc = (row: KocRow): Koc => ({
  kocId: row.koc_id,
  displayName: row.display_name,
  bio: row.bio,
  followers: row.followers,
  averageViews: row.average_views,
  engagementRate: row.engagement_rate,
  historicalConversionRate: row.historical_conversion_rate,
  audienceProfile: parseAudienceProfile(row.audience_profile_json),
  styleTags: parseWarnings<string>(row.style_tags_json),
  isColdStart: row.is_cold_start === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const serializeAudienceProfile = (profile: Koc["audienceProfile"]): string =>
  JSON.stringify(profile);

export const createKocRepository = (db: D1Database): KocRepository => ({
  list: async (request) => {
    const result = await page<KocRow>(
      db,
      "SELECT * FROM kocs ORDER BY created_at DESC LIMIT ? OFFSET ?",
      "SELECT COUNT(*) AS total FROM kocs",
      request,
    );
    return { ...result, items: result.items.map(toKoc) };
  },
  getById: async (kocId) => {
    try {
      const row = await db
        .prepare("SELECT * FROM kocs WHERE koc_id = ?1")
        .bind(kocId)
        .first<KocRow>();
      return row === null ? null : toKoc(row);
    } catch (error) {
      throw databaseError("get koc", error);
    }
  },
  create: async (koc) => {
    try {
      await db
        .prepare(
          "INSERT INTO kocs (koc_id, display_name, bio, followers, average_views, engagement_rate, historical_conversion_rate, audience_profile_json, style_tags_json, is_cold_start, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          koc.kocId,
          koc.displayName,
          koc.bio,
          koc.followers,
          koc.averageViews,
          koc.engagementRate,
          koc.historicalConversionRate,
          serializeAudienceProfile(koc.audienceProfile),
          serializeStringArray(koc.styleTags),
          koc.isColdStart ? 1 : 0,
          koc.createdAt,
          koc.updatedAt,
        )
        .run();
      return koc;
    } catch (error) {
      throw databaseError("create koc", error);
    }
  },
  update: async (kocId, input, updatedAt) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    const add = (field: string, value: unknown): void => {
      fields.push(`${field} = ?`);
      values.push(value);
    };
    if (input.displayName !== undefined) add("display_name", input.displayName);
    if (input.bio !== undefined) add("bio", input.bio);
    if (input.followers !== undefined) add("followers", input.followers);
    if (input.averageViews !== undefined) add("average_views", input.averageViews);
    if (input.engagementRate !== undefined) add("engagement_rate", input.engagementRate);
    if (input.historicalConversionRate !== undefined)
      add("historical_conversion_rate", input.historicalConversionRate);
    if (input.audienceProfile !== undefined)
      add("audience_profile_json", serializeAudienceProfile(input.audienceProfile));
    if (input.styleTags !== undefined)
      add("style_tags_json", serializeStringArray(input.styleTags));
    if (input.isColdStart !== undefined) add("is_cold_start", input.isColdStart ? 1 : 0);
    add("updated_at", updatedAt);
    try {
      const result = await db
        .prepare(`UPDATE kocs SET ${fields.join(", ")} WHERE koc_id = ?`)
        .bind(...values, kocId)
        .run();
      if (result.meta.changes === 0) return null;
      const row = await db
        .prepare("SELECT * FROM kocs WHERE koc_id = ?1")
        .bind(kocId)
        .first<KocRow>();
      return row === null ? null : toKoc(row);
    } catch (error) {
      throw databaseError("update koc", error);
    }
  },
  delete: async (kocId) => {
    try {
      const result = await db.prepare("DELETE FROM kocs WHERE koc_id = ?1").bind(kocId).run();
      return result.meta.changes > 0;
    } catch (error) {
      throw databaseError("delete koc", error);
    }
  },
});

interface CampaignRow {
  campaign_id: string;
  name: string;
  objective: string;
  start_date: string;
  end_date: string;
  promotion_rate: number;
  season: string;
  status: Campaign["status"];
  budget: number;
  created_at: string;
  updated_at: string;
}

const toCampaign = (row: CampaignRow): Campaign => ({
  campaignId: row.campaign_id,
  name: row.name,
  objective: row.objective,
  startDate: row.start_date,
  endDate: row.end_date,
  promotionRate: row.promotion_rate,
  season: row.season,
  status: row.status,
  budget: row.budget,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createCampaignRepository = (db: D1Database): CampaignRepository => ({
  list: async (request) => {
    const result = await page<CampaignRow>(
      db,
      "SELECT * FROM campaigns ORDER BY created_at DESC LIMIT ? OFFSET ?",
      "SELECT COUNT(*) AS total FROM campaigns",
      request,
    );
    return { ...result, items: result.items.map(toCampaign) };
  },
  getById: async (campaignId) => {
    try {
      const row = await db
        .prepare("SELECT * FROM campaigns WHERE campaign_id = ?1")
        .bind(campaignId)
        .first<CampaignRow>();
      return row === null ? null : toCampaign(row);
    } catch (error) {
      throw databaseError("get campaign", error);
    }
  },
  create: async (campaign) => {
    try {
      await db
        .prepare(
          "INSERT INTO campaigns (campaign_id, name, objective, start_date, end_date, promotion_rate, season, status, budget, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          campaign.campaignId,
          campaign.name,
          campaign.objective,
          campaign.startDate,
          campaign.endDate,
          campaign.promotionRate,
          campaign.season,
          campaign.status,
          campaign.budget,
          campaign.createdAt,
          campaign.updatedAt,
        )
        .run();
      return campaign;
    } catch (error) {
      throw databaseError("create campaign", error);
    }
  },
  update: async (campaignId, input: UpdateCampaignInput, updatedAt) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    const add = (field: string, value: unknown): void => {
      fields.push(`${field} = ?`);
      values.push(value);
    };
    if (input.name !== undefined) add("name", input.name);
    if (input.objective !== undefined) add("objective", input.objective);
    if (input.startDate !== undefined) add("start_date", input.startDate);
    if (input.endDate !== undefined) add("end_date", input.endDate);
    if (input.promotionRate !== undefined) add("promotion_rate", input.promotionRate);
    if (input.season !== undefined) add("season", input.season);
    if (input.status !== undefined) add("status", input.status);
    if (input.budget !== undefined) add("budget", input.budget);
    add("updated_at", updatedAt);
    try {
      const result = await db
        .prepare(`UPDATE campaigns SET ${fields.join(", ")} WHERE campaign_id = ?`)
        .bind(...values, campaignId)
        .run();
      if (result.meta.changes === 0) return null;
      const row = await db
        .prepare("SELECT * FROM campaigns WHERE campaign_id = ?1")
        .bind(campaignId)
        .first<CampaignRow>();
      return row === null ? null : toCampaign(row);
    } catch (error) {
      throw databaseError("update campaign", error);
    }
  },
  delete: async (campaignId) => {
    try {
      const result = await db
        .prepare("DELETE FROM campaigns WHERE campaign_id = ?1")
        .bind(campaignId)
        .run();
      return result.meta.changes > 0;
    } catch (error) {
      throw databaseError("delete campaign", error);
    }
  },
});

interface CampaignResultRow {
  result_id: string;
  campaign_id: string;
  sku_id: string;
  koc_id: string;
  views: number;
  clicks: number;
  orders: number;
  returns: number;
  revenue: number;
  selling_price: number;
  stock_before: number;
  stock_after: number;
  spend: number;
  roi: number;
  scenario: string;
  created_at: string;
}

const toCampaignResult = (row: CampaignResultRow): CampaignResult => ({
  resultId: row.result_id,
  campaignId: row.campaign_id,
  skuId: row.sku_id,
  kocId: row.koc_id,
  views: row.views,
  clicks: row.clicks,
  orders: row.orders,
  returns: row.returns,
  revenue: row.revenue,
  sellingPrice: row.selling_price,
  stockBefore: row.stock_before,
  stockAfter: row.stock_after,
  spend: row.spend,
  roi: row.roi,
  scenario: row.scenario,
  createdAt: row.created_at,
});

export const createCampaignResultRepository = (db: D1Database): CampaignResultRepository => ({
  listByCampaign: async (campaignId, request) => {
    const result = await page<CampaignResultRow>(
      db,
      "SELECT * FROM campaign_results WHERE campaign_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      "SELECT COUNT(*) AS total FROM campaign_results WHERE campaign_id = ?",
      request,
      [campaignId],
    );
    return { ...result, items: result.items.map(toCampaignResult) };
  },
  listBySkuAndKoc: async (skuId, kocId, request) => {
    const result = await page<CampaignResultRow>(
      db,
      "SELECT * FROM campaign_results WHERE sku_id = ? AND koc_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      "SELECT COUNT(*) AS total FROM campaign_results WHERE sku_id = ? AND koc_id = ?",
      request,
      [skuId, kocId],
    );
    return { ...result, items: result.items.map(toCampaignResult) };
  },
  create: async (result) => {
    try {
      await db
        .prepare(
          "INSERT INTO campaign_results (result_id, campaign_id, sku_id, koc_id, views, clicks, orders, returns, revenue, selling_price, stock_before, stock_after, spend, roi, scenario, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          result.resultId,
          result.campaignId,
          result.skuId,
          result.kocId,
          result.views,
          result.clicks,
          result.orders,
          result.returns,
          result.revenue,
          result.sellingPrice,
          result.stockBefore,
          result.stockAfter,
          result.spend,
          result.roi,
          result.scenario,
          result.createdAt,
        )
        .run();
      return result;
    } catch (error) {
      throw databaseError("create campaign result", error);
    }
  },
});

interface DatasetJobRow {
  job_id: string;
  status: DatasetJob["status"];
  parameters_json: string;
  fallback_used: number;
  warnings_json: string;
  artifact_key: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const toDatasetJob = (row: DatasetJobRow): DatasetJob => ({
  jobId: row.job_id,
  status: row.status,
  parameters: JSON.parse(row.parameters_json) as DatasetJob["parameters"],
  fallbackUsed: row.fallback_used === 1,
  warnings: parseWarnings(row.warnings_json),
  artifactKey: row.artifact_key,
  errorMessage: row.error_message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createDatasetJobRepository = (db: D1Database): DatasetJobRepository => ({
  create: async (job) => {
    try {
      await db
        .prepare(
          "INSERT INTO dataset_jobs (job_id, status, parameters_json, fallback_used, warnings_json, artifact_key, error_message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          job.jobId,
          job.status,
          JSON.stringify(job.parameters),
          job.fallbackUsed ? 1 : 0,
          JSON.stringify(job.warnings),
          job.artifactKey,
          job.errorMessage,
          job.createdAt,
          job.updatedAt,
        )
        .run();
      return job;
    } catch (error) {
      throw databaseError("create dataset job", error);
    }
  },
  getById: async (jobId) => {
    try {
      const row = await db
        .prepare("SELECT * FROM dataset_jobs WHERE job_id = ?1")
        .bind(jobId)
        .first<DatasetJobRow>();
      return row === null ? null : toDatasetJob(row);
    } catch (error) {
      throw databaseError("get dataset job", error);
    }
  },
  update: async (jobId, patch) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    const add = (field: string, value: unknown): void => {
      fields.push(`${field} = ?`);
      values.push(value);
    };
    if (patch.status !== undefined) add("status", patch.status);
    if (patch.parameters !== undefined) add("parameters_json", JSON.stringify(patch.parameters));
    if (patch.fallbackUsed !== undefined) add("fallback_used", patch.fallbackUsed ? 1 : 0);
    if (patch.warnings !== undefined) add("warnings_json", JSON.stringify(patch.warnings));
    if (patch.artifactKey !== undefined) add("artifact_key", patch.artifactKey);
    if (patch.errorMessage !== undefined) add("error_message", patch.errorMessage);
    if (patch.updatedAt !== undefined) add("updated_at", patch.updatedAt);
    try {
      const result = await db
        .prepare(`UPDATE dataset_jobs SET ${fields.join(", ")} WHERE job_id = ?`)
        .bind(...values, jobId)
        .run();
      if (result.meta.changes === 0) return null;
      const row = await db
        .prepare("SELECT * FROM dataset_jobs WHERE job_id = ?1")
        .bind(jobId)
        .first<DatasetJobRow>();
      return row === null ? null : toDatasetJob(row);
    } catch (error) {
      throw databaseError("update dataset job", error);
    }
  },
});
