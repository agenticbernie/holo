import {
  campaignResultSchema,
  campaignSchema,
  datasetJobSchema,
  kocSchema,
  productSchema,
  recommendationSchema,
} from "@holo/contracts";
import type {
  Campaign,
  CampaignResult,
  DatasetJob,
  Koc,
  Product,
  RecommendationScore,
} from "@holo/domain";

export const productResponse = (product: Product) =>
  productSchema.parse({
    ...product,
    styleTags: [...product.styleTags],
    targetAudience: [...product.targetAudience],
  });

export const kocResponse = (koc: Koc) =>
  kocSchema.parse({
    ...koc,
    audienceProfile: {
      ...koc.audienceProfile,
      genders: [...koc.audienceProfile.genders],
      regions: [...koc.audienceProfile.regions],
      interests: [...koc.audienceProfile.interests],
    },
    styleTags: [...koc.styleTags],
  });

export const campaignResponse = (campaign: Campaign) => campaignSchema.parse({ ...campaign });

export const campaignResultResponse = (result: CampaignResult) =>
  campaignResultSchema.parse({ ...result });

export const recommendationResponse = (recommendation: RecommendationScore) =>
  recommendationSchema.parse({
    ...recommendation,
    breakdown: { ...recommendation.breakdown },
  });

export const datasetJobResponse = (job: DatasetJob) =>
  datasetJobSchema.parse({
    ...job,
    parameters: { ...job.parameters },
    warnings: job.warnings.map((warning) => ({ ...warning })),
  });
