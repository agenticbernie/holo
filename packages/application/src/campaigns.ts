import {
  type Campaign,
  type CampaignId,
  type CampaignRepository,
  type CampaignResult,
  type CampaignResultRepository,
  type CreateCampaignInput,
  type CreateCampaignResultInput,
  calculateCampaignResult,
  NotFoundError,
  type UpdateCampaignInput,
  validateCampaignPatch,
  validateCreateCampaign,
} from "@pipa/domain";
import type { ApplicationRuntime } from "./common";

export interface CampaignApplication {
  readonly list: (
    limit?: number,
    offset?: number,
  ) => Promise<Awaited<ReturnType<CampaignRepository["list"]>>>;
  readonly get: (campaignId: CampaignId) => Promise<Campaign>;
  readonly create: (input: CreateCampaignInput) => Promise<Campaign>;
  readonly update: (campaignId: CampaignId, input: UpdateCampaignInput) => Promise<Campaign>;
  readonly remove: (campaignId: CampaignId) => Promise<void>;
  readonly listResults: (
    campaignId: CampaignId,
    limit?: number,
    offset?: number,
  ) => Promise<Awaited<ReturnType<CampaignResultRepository["listByCampaign"]>>>;
  readonly createResult: (input: CreateCampaignResultInput) => Promise<CampaignResult>;
}

export const createCampaignApplication = (
  repository: CampaignRepository,
  resultRepository: CampaignResultRepository,
  runtime: ApplicationRuntime,
): CampaignApplication => ({
  list: (limit, offset) => repository.list({ limit: limit ?? 50, offset: offset ?? 0 }),
  get: async (campaignId) => {
    const campaign = await repository.getById(campaignId);
    if (campaign === null) throw new NotFoundError("Chiến dịch", campaignId);
    return campaign;
  },
  create: async (input) => {
    validateCreateCampaign(input);
    const timestamp = runtime.clock.now();
    return repository.create({
      ...input,
      campaignId: runtime.ids.next("campaign"),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
  update: async (campaignId, input) => {
    validateCampaignPatch(input);
    const campaign = await repository.update(campaignId, input, runtime.clock.now());
    if (campaign === null) throw new NotFoundError("Chiến dịch", campaignId);
    return campaign;
  },
  remove: async (campaignId) => {
    if (!(await repository.delete(campaignId))) throw new NotFoundError("Chiến dịch", campaignId);
  },
  listResults: async (campaignId, limit, offset) => {
    await (async () => {
      const campaign = await repository.getById(campaignId);
      if (campaign === null) throw new NotFoundError("Chiến dịch", campaignId);
    })();
    return resultRepository.listByCampaign(campaignId, {
      limit: limit ?? 50,
      offset: offset ?? 0,
    });
  },
  createResult: async (input) => {
    const campaign = await repository.getById(input.campaignId);
    if (campaign === null) throw new NotFoundError("Chiến dịch", input.campaignId);
    const calculated = calculateCampaignResult(input);
    return resultRepository.create({
      ...calculated,
      resultId: runtime.ids.next("result"),
      createdAt: runtime.clock.now(),
    });
  },
});
