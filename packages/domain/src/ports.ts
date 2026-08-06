import type { CampaignRepository, CampaignResultRepository } from "./campaign";
import type { DatasetJobRepository } from "./dataset";
import type { KocRepository } from "./koc";
import type { ProductRepository } from "./product";

export interface RepositoryPorts {
  readonly products: ProductRepository;
  readonly kocs: KocRepository;
  readonly campaigns: CampaignRepository;
  readonly campaignResults: CampaignResultRepository;
  readonly datasetJobs: DatasetJobRepository;
}
