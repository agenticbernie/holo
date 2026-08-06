import {
  type Campaign,
  type CampaignResult,
  type DatasetGenerationParameters,
  type DatasetWarning,
  type GeneratedDataset,
  type Koc,
  type Product,
  validateDatasetParameters,
  validateGeneratedDataset,
} from "@pipa/domain";
import type { KimiClient, SemanticRecord } from "@pipa/llm-client";
import { Effect } from "effect";
import { fallbackSemanticRecords } from "./fallback";
import { SeededRandom } from "./random";

export interface SyntheticGenerationOptions {
  readonly now: string;
  readonly requestId: string;
  readonly semanticProvider?: KimiClient;
}

export interface SyntheticGenerationResult {
  readonly dataset: GeneratedDataset;
  readonly fallbackUsed: boolean;
}

const categories = ["dress", "top", "bottom", "outerwear", "accessory", "footwear"] as const;
const scenarios = [
  "successful",
  "failed",
  "high_view_low_conversion",
  "low_view_high_conversion",
  "inventory_shortage",
  "seasonality",
  "promotion",
] as const;

const fallbackWarning = (stage: string, requestId: string, now: string): DatasetWarning => ({
  code: "KIMI_FALLBACK",
  stage,
  fallbackStrategy: "deterministic_template",
  timestamp: now,
  requestId,
});

const getSemantics = async (
  kind: "product" | "koc" | "campaign",
  count: number,
  seed: number,
  options: SyntheticGenerationOptions,
): Promise<{ records: readonly SemanticRecord[]; warning: DatasetWarning | null }> => {
  if (options.semanticProvider === undefined) {
    return {
      records: fallbackSemanticRecords(kind, count, seed),
      warning: fallbackWarning(kind, options.requestId, options.now),
    };
  }
  try {
    const records = await Effect.runPromise(
      options.semanticProvider.generateBatch({ kind, count, seed }),
    );
    return { records, warning: null };
  } catch {
    return {
      records: fallbackSemanticRecords(kind, count, seed),
      warning: fallbackWarning(kind, options.requestId, options.now),
    };
  }
};

const productFrom = (
  index: number,
  semantic: SemanticRecord,
  random: SeededRandom,
  now: string,
  seed: number,
): Product => ({
  skuId: `sku_${seed}_${String(index + 1).padStart(4, "0")}`,
  name: semantic.name,
  description: semantic.description,
  category: random.pick(categories),
  brand: random.pick(["Pipa Studio", "Mây Atelier", "Luma Wear", "Nắng Concept"]),
  sellingPrice: random.pick([390_000, 590_000, 790_000, 890_000, 1_290_000]),
  stock: random.integer(80, 500),
  styleTags: semantic.styleTags,
  targetAudience: semantic.targetAudience,
  createdAt: now,
  updatedAt: now,
});

const kocFrom = (
  index: number,
  semantic: SemanticRecord,
  random: SeededRandom,
  now: string,
  seed: number,
  coldStartRate: number,
  totalKocs: number,
): Koc => ({
  kocId: `koc_${seed}_${String(index + 1).padStart(4, "0")}`,
  displayName: semantic.name,
  bio: semantic.bio,
  followers: random.integer(2_000, 300_000),
  averageViews: random.integer(500, 150_000),
  engagementRate: random.decimal(0.02, 0.18),
  historicalConversionRate: random.decimal(0.002, 0.05),
  audienceProfile: {
    ageRange: semantic.ageRange,
    genders: semantic.genders,
    regions: semantic.regions,
    interests: semantic.interests,
  },
  styleTags: semantic.styleTags,
  isColdStart: index < Math.ceil(coldStartRate * totalKocs),
  createdAt: now,
  updatedAt: now,
});

const campaignFrom = (
  index: number,
  semantic: SemanticRecord,
  random: SeededRandom,
  now: string,
  seed: number,
): Campaign => ({
  campaignId: `campaign_${seed}_${String(index + 1).padStart(4, "0")}`,
  name: semantic.name,
  objective: semantic.objective,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  promotionRate: random.decimal(0, 0.35),
  season: semantic.season,
  status: "completed",
  budget: random.integer(10_000_000, 100_000_000),
  createdAt: now,
  updatedAt: now,
});

const resultFrom = (
  index: number,
  product: Product,
  koc: Koc,
  campaign: Campaign,
  random: SeededRandom,
  remainingStock: Map<string, number>,
  now: string,
  seed: number,
): CampaignResult => {
  const scenario = scenarios[index % scenarios.length] ?? "successful";
  const inventory = remainingStock.get(product.skuId) ?? product.stock;
  const inventoryBefore =
    scenario === "inventory_shortage" ? Math.min(inventory, random.integer(1, 8)) : inventory;
  const baseViews = Math.max(20, Math.round(koc.averageViews * random.decimal(0.6, 1.4)));
  const views =
    scenario === "low_view_high_conversion"
      ? Math.max(20, Math.round(baseViews * 0.2))
      : scenario === "high_view_low_conversion"
        ? Math.round(baseViews * 3)
        : baseViews;
  const clickRate =
    scenario === "failed"
      ? 0.015
      : scenario === "high_view_low_conversion"
        ? 0.025
        : 0.04 + koc.engagementRate * 0.35;
  const clicks = Math.min(views, Math.floor(views * clickRate));
  const conversionRate =
    scenario === "high_view_low_conversion"
      ? 0.002
      : scenario === "low_view_high_conversion"
        ? 0.12
        : 0.01 + koc.historicalConversionRate * 0.5;
  const promotionBoost = scenario === "promotion" ? 1 + campaign.promotionRate : 1;
  const seasonalBoost = scenario === "seasonality" ? 1.25 : 1;
  const requestedOrders = Math.floor(clicks * conversionRate * promotionBoost * seasonalBoost);
  const orders = Math.min(inventoryBefore, requestedOrders);
  const stockAfter = Math.max(0, inventoryBefore - orders);
  remainingStock.set(product.skuId, Math.max(0, inventory - orders));
  const returns = Math.min(orders, Math.floor(orders * random.decimal(0.01, 0.15)));
  const sellingPrice = Math.round(product.sellingPrice * (1 - campaign.promotionRate));
  const revenue = orders * sellingPrice;
  const spend = Math.round(20_000 + views * 0.15 + clicks * 2 + campaign.budget * 0.005);
  const roi = spend === 0 ? 0 : (revenue - spend) / spend;
  return {
    resultId: `result_${seed}_${String(index + 1).padStart(5, "0")}`,
    campaignId: campaign.campaignId,
    skuId: product.skuId,
    kocId: koc.kocId,
    views,
    clicks,
    orders,
    returns,
    revenue,
    sellingPrice,
    stockBefore: inventoryBefore,
    stockAfter,
    spend,
    roi,
    scenario,
    createdAt: now,
  };
};

export const generateSyntheticDataset = async (
  parameters: DatasetGenerationParameters,
  options: SyntheticGenerationOptions,
): Promise<SyntheticGenerationResult> => {
  validateDatasetParameters(parameters);
  const warnings: DatasetWarning[] = [];
  const productSemantics = await getSemantics(
    "product",
    parameters.products,
    parameters.seed,
    options,
  );
  const kocSemantics = await getSemantics("koc", parameters.kocs, parameters.seed + 1, options);
  const campaignSemantics = await getSemantics(
    "campaign",
    parameters.campaigns,
    parameters.seed + 2,
    options,
  );
  for (const warning of [
    productSemantics.warning,
    kocSemantics.warning,
    campaignSemantics.warning,
  ]) {
    if (warning !== null) warnings.push(warning);
  }
  const random = new SeededRandom(parameters.seed);
  const products = productSemantics.records.map((semantic, index) =>
    productFrom(index, semantic, random, options.now, parameters.seed),
  );
  const kocs = kocSemantics.records.map((semantic, index) =>
    kocFrom(
      index,
      semantic,
      random,
      options.now,
      parameters.seed,
      parameters.coldStartRate,
      parameters.kocs,
    ),
  );
  const campaigns = campaignSemantics.records.map((semantic, index) =>
    campaignFrom(index, semantic, random, options.now, parameters.seed),
  );
  const remainingStock = new Map(products.map((product) => [product.skuId, product.stock]));
  const campaignResults = Array.from({ length: parameters.interactions }, (_, index) => {
    const product = products[index % products.length];
    const koc = kocs[index % kocs.length];
    const campaign = campaigns[index % campaigns.length];
    if (product === undefined || koc === undefined || campaign === undefined)
      throw new Error("Invalid generator dimensions");
    return resultFrom(
      index,
      product,
      koc,
      campaign,
      random,
      remainingStock,
      options.now,
      parameters.seed,
    );
  });
  const dataset: GeneratedDataset = {
    version: `dataset-${parameters.seed}`,
    parameters,
    products,
    kocs,
    campaigns,
    campaignResults,
    warnings,
  };
  validateGeneratedDataset(dataset);
  return { dataset, fallbackUsed: warnings.length > 0 };
};

export { fallbackSemanticRecords } from "./fallback";
export { SeededRandom } from "./random";
