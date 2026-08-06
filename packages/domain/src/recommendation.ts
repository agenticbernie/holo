import type { Campaign, CampaignResult } from "./campaign";
import type { Koc } from "./koc";
import type { Product } from "./product";
import type { KocId } from "./shared";

export interface RecommendationWeights {
  readonly styleCompatibility: number;
  readonly audienceCompatibility: number;
  readonly performance: number;
  readonly campaignFit: number;
  readonly semanticCompatibility: number;
}

export const defaultRecommendationWeights: RecommendationWeights = {
  styleCompatibility: 0.25,
  audienceCompatibility: 0.2,
  performance: 0.25,
  campaignFit: 0.15,
  semanticCompatibility: 0.15,
};

export interface RecommendationCandidate {
  readonly product: Product;
  readonly koc: Koc;
  readonly campaign: Campaign | null;
  readonly historicalResults: readonly CampaignResult[];
}

export interface RecommendationScoreBreakdown {
  readonly styleCompatibility: number;
  readonly audienceCompatibility: number;
  readonly performance: number;
  readonly campaignFit: number;
  readonly semanticCompatibility: number;
}

export interface RecommendationScore {
  readonly kocId: KocId;
  readonly totalScore: number;
  readonly breakdown: RecommendationScoreBreakdown;
  readonly explanation: string;
}

const clamp = (value: number): number => Math.min(100, Math.max(0, value));

const overlapScore = (left: readonly string[], right: readonly string[]): number => {
  if (left.length === 0 || right.length === 0) return 0;
  const rightValues = new Set(right.map((value) => value.toLowerCase()));
  const matches = left.filter((value) => rightValues.has(value.toLowerCase())).length;
  return clamp((matches / Math.max(left.length, right.length)) * 100);
};

const performanceScore = (koc: Koc, results: readonly CampaignResult[]): number => {
  if (koc.isColdStart || results.length === 0) {
    return clamp(koc.engagementRate * 70 + Math.min(koc.averageViews / 100_000, 1) * 30);
  }
  const totalViews = results.reduce((sum, result) => sum + result.views, 0);
  const totalOrders = results.reduce((sum, result) => sum + result.orders, 0);
  const conversion = totalViews === 0 ? 0 : (totalOrders / totalViews) * 100;
  return clamp(koc.engagementRate * 35 + koc.historicalConversionRate * 45 + conversion * 20);
};

const campaignFitScore = (candidate: RecommendationCandidate): number => {
  if (candidate.campaign === null) return 50;
  const promotionBoost = candidate.campaign.promotionRate * 50;
  const budgetSignal = Math.min(candidate.campaign.budget / 10_000, 1) * 30;
  const seasonSignal = candidate.product.targetAudience.some((value) =>
    value.toLowerCase().includes(candidate.campaign?.season.toLowerCase() ?? ""),
  )
    ? 20
    : 0;
  return clamp(promotionBoost + budgetSignal + seasonSignal);
};

const semanticScore = (product: Product, koc: Koc): number =>
  overlapScore(product.styleTags, koc.styleTags);

const normalizeWeights = (weights: RecommendationWeights): RecommendationWeights => {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return defaultRecommendationWeights;
  return {
    styleCompatibility: weights.styleCompatibility / total,
    audienceCompatibility: weights.audienceCompatibility / total,
    performance: weights.performance / total,
    campaignFit: weights.campaignFit / total,
    semanticCompatibility: weights.semanticCompatibility / total,
  };
};

export const scoreRecommendation = (
  candidate: RecommendationCandidate,
  requestedWeights: RecommendationWeights = defaultRecommendationWeights,
): RecommendationScore => {
  const weights = normalizeWeights(requestedWeights);
  const breakdown: RecommendationScoreBreakdown = {
    styleCompatibility: overlapScore(candidate.product.styleTags, candidate.koc.styleTags),
    audienceCompatibility: overlapScore(
      candidate.product.targetAudience,
      candidate.koc.audienceProfile.interests,
    ),
    performance: performanceScore(candidate.koc, candidate.historicalResults),
    campaignFit: campaignFitScore(candidate),
    semanticCompatibility: semanticScore(candidate.product, candidate.koc),
  };
  const totalScore = clamp(
    breakdown.styleCompatibility * weights.styleCompatibility +
      breakdown.audienceCompatibility * weights.audienceCompatibility +
      breakdown.performance * weights.performance +
      breakdown.campaignFit * weights.campaignFit +
      breakdown.semanticCompatibility * weights.semanticCompatibility,
  );
  const strongest = Object.entries(breakdown).sort(([, left], [, right]) => right - left)[0];
  const strongestLabel: Record<keyof RecommendationScoreBreakdown, string> = {
    styleCompatibility: "phong cách phù hợp",
    audienceCompatibility: "tệp khán giả phù hợp",
    performance: "hiệu suất lịch sử",
    campaignFit: "độ phù hợp chiến dịch",
    semanticCompatibility: "tương thích ngữ nghĩa",
  };
  const label = strongest?.[0] as keyof RecommendationScoreBreakdown | undefined;
  const explanation =
    label !== undefined && strongest !== undefined
      ? `KOC này được ưu tiên nhờ ${strongestLabel[label]} (${Math.round(strongest[1])}/100).`
      : "KOC được đánh giá theo bộ trọng số mặc định.";
  return {
    kocId: candidate.koc.kocId,
    totalScore: Math.round(totalScore * 100) / 100,
    breakdown,
    explanation,
  };
};

export const rankRecommendations = (
  candidates: readonly RecommendationCandidate[],
  weights: RecommendationWeights = defaultRecommendationWeights,
): readonly RecommendationScore[] =>
  candidates
    .map((candidate) => scoreRecommendation(candidate, weights))
    .sort(
      (left, right) => right.totalScore - left.totalScore || left.kocId.localeCompare(right.kocId),
    );
