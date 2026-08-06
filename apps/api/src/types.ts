import type {
  CampaignApplication,
  DatasetApplication,
  KocApplication,
  ProductApplication,
  RecommendationApplication,
} from "@pipa/application";
import type { CampaignResultRepository, DatasetJobRepository } from "@pipa/domain";
import type { ArtifactStorage } from "@pipa/storage";

export type PipaEnv = {
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
