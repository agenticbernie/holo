import type {
  CampaignApplication,
  DatasetApplication,
  KocApplication,
  ProductApplication,
  RecommendationApplication,
} from "@holo/application";
import type { CampaignResultRepository, DatasetJobRepository } from "@holo/domain";
import type { ArtifactStorage } from "@holo/storage";

export type HoloEnv = {
  Bindings: Env;
  Variables: {
    requestId: string;
  };
};

export interface AppDependencies {
  readonly products: ProductApplication;
  readonly kocs: KocApplication;
  readonly campaigns: CampaignApplication;
  readonly recommendations: RecommendationApplication;
  readonly datasets: DatasetApplication;
  readonly campaignResults: CampaignResultRepository;
  readonly datasetJobs: DatasetJobRepository;
  readonly storage: ArtifactStorage;
}
