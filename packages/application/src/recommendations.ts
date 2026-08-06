import {
  type CampaignRepository,
  type CampaignResultRepository,
  type KocRepository,
  NotFoundError,
  type ProductRepository,
  type RecommendationScore,
  type RecommendationWeights,
  rankRecommendations,
} from "@pipa/domain";

export interface RecommendationInput {
  readonly skuId: string;
  readonly campaignId?: string | undefined;
  readonly weights?: RecommendationWeights | undefined;
  readonly limit: number;
}

export interface RecommendationApplication {
  readonly recommend: (input: RecommendationInput) => Promise<readonly RecommendationScore[]>;
}

export const createRecommendationApplication = (dependencies: {
  readonly products: ProductRepository;
  readonly kocs: KocRepository;
  readonly campaigns: CampaignRepository;
  readonly results: CampaignResultRepository;
}): RecommendationApplication => ({
  recommend: async (input) => {
    const product = await dependencies.products.getById(input.skuId);
    if (product === null) throw new NotFoundError("SKU", input.skuId);
    const campaign = input.campaignId
      ? await dependencies.campaigns.getById(input.campaignId)
      : null;
    if (input.campaignId !== undefined && campaign === null) {
      throw new NotFoundError("Chiến dịch", input.campaignId);
    }
    const kocs = await dependencies.kocs.list({ limit: 250, offset: 0 });
    const candidates = await Promise.all(
      kocs.items.map(async (koc) => ({
        product,
        koc,
        campaign,
        historicalResults: (
          await dependencies.results.listBySkuAndKoc(product.skuId, koc.kocId, {
            limit: 250,
            offset: 0,
          })
        ).items,
      })),
    );
    return rankRecommendations(candidates, input.weights).slice(0, input.limit);
  },
});
