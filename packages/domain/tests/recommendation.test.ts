import { describe, expect, it } from "vitest";
import {
  type Campaign,
  defaultRecommendationWeights,
  type Koc,
  type Product,
  rankRecommendations,
} from "../src/index";

const product: Product = {
  skuId: "sku_test",
  name: "Minimal dress",
  description: "Test product",
  category: "dress",
  brand: "Holo",
  sellingPrice: 800_000,
  stock: 100,
  styleTags: ["minimal", "summer"],
  targetAudience: ["women-25-34", "urban"],
  createdAt: "2026-08-06T00:00:00.000Z",
  updatedAt: "2026-08-06T00:00:00.000Z",
};

const campaign: Campaign = {
  campaignId: "campaign_test",
  name: "Summer",
  objective: "Awareness",
  startDate: "2026-06-01",
  endDate: "2026-07-31",
  promotionRate: 0.2,
  season: "summer",
  status: "running",
  budget: 50_000_000,
  createdAt: "2026-08-06T00:00:00.000Z",
  updatedAt: "2026-08-06T00:00:00.000Z",
};

const makeKoc = (kocId: string, isColdStart: boolean, styleTags: readonly string[]): Koc => ({
  kocId,
  displayName: kocId,
  bio: "Test KOC",
  followers: 50_000,
  averageViews: 30_000,
  engagementRate: 0.1,
  historicalConversionRate: 0.03,
  audienceProfile: {
    ageRange: "25-34",
    genders: ["female"],
    regions: ["urban"],
    interests: ["minimal", "summer"],
  },
  styleTags,
  isColdStart,
  createdAt: "2026-08-06T00:00:00.000Z",
  updatedAt: "2026-08-06T00:00:00.000Z",
});

describe("recommendation scoring", () => {
  it("ranks observable feature compatibility deterministically", () => {
    const results = rankRecommendations(
      [
        {
          product,
          koc: makeKoc("koc_good", false, ["minimal", "summer"]),
          campaign,
          historicalResults: [],
        },
        { product, koc: makeKoc("koc_poor", false, ["vintage"]), campaign, historicalResults: [] },
      ],
      defaultRecommendationWeights,
    );

    expect(results[0]?.kocId).toBe("koc_good");
    expect(results[0]?.totalScore).toBeGreaterThan(results[1]?.totalScore ?? 0);
    expect(results[0]?.totalScore).toBeGreaterThanOrEqual(0);
    expect(results[0]?.totalScore).toBeLessThanOrEqual(100);
    expect(results[0]?.explanation).toContain("phù hợp");
  });

  it("scores cold-start KOCs without historical results", () => {
    const [score] = rankRecommendations([
      {
        product,
        koc: makeKoc("koc_cold", true, ["minimal"]),
        campaign: null,
        historicalResults: [],
      },
    ]);

    expect(score?.totalScore).toBeGreaterThan(0);
    expect(score?.breakdown.performance).toBeGreaterThan(0);
  });
});
