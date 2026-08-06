import type { Campaign, CampaignResult } from "./campaign";
import type { Koc } from "./koc";
import type { Product } from "./product";
import type { DatasetJobId, ISODateTime } from "./shared";
import { ValidationError } from "./shared";

export type DatasetJobStatus = "queued" | "running" | "completed" | "failed";

export interface DatasetGenerationParameters {
  readonly products: number;
  readonly kocs: number;
  readonly campaigns: number;
  readonly interactions: number;
  readonly coldStartRate: number;
  readonly seed: number;
}

export interface DatasetWarning {
  readonly code: string;
  readonly stage: string;
  readonly fallbackStrategy: string;
  readonly timestamp: ISODateTime;
  readonly requestId: string;
}

export interface DatasetJob {
  readonly jobId: DatasetJobId;
  readonly status: DatasetJobStatus;
  readonly parameters: DatasetGenerationParameters;
  readonly fallbackUsed: boolean;
  readonly warnings: readonly DatasetWarning[];
  readonly artifactKey: string | null;
  readonly errorMessage: string | null;
  readonly createdAt: ISODateTime;
  readonly updatedAt: ISODateTime;
}

export interface GeneratedDataset {
  readonly version: string;
  readonly parameters: DatasetGenerationParameters;
  readonly products: readonly Product[];
  readonly kocs: readonly Koc[];
  readonly campaigns: readonly Campaign[];
  readonly campaignResults: readonly CampaignResult[];
  readonly warnings: readonly DatasetWarning[];
}

export interface DatasetJobRepository {
  readonly create: (job: DatasetJob) => Promise<DatasetJob>;
  readonly getById: (jobId: DatasetJobId) => Promise<DatasetJob | null>;
  readonly update: (jobId: DatasetJobId, patch: Partial<DatasetJob>) => Promise<DatasetJob | null>;
}

export const defaultDatasetParameters: DatasetGenerationParameters = {
  products: 200,
  kocs: 80,
  campaigns: 200,
  interactions: 3_000,
  coldStartRate: 0.25,
  seed: 2_026_080_6,
};

export const validateDatasetParameters = (input: DatasetGenerationParameters): void => {
  if (!Number.isInteger(input.products) || input.products < 1 || input.products > 500) {
    throw new ValidationError("Số SKU phải nằm trong khoảng từ 1 đến 500.", { field: "products" });
  }
  if (!Number.isInteger(input.kocs) || input.kocs < 1 || input.kocs > 250) {
    throw new ValidationError("Số KOC phải nằm trong khoảng từ 1 đến 250.", { field: "kocs" });
  }
  if (!Number.isInteger(input.campaigns) || input.campaigns < 1 || input.campaigns > 1_000) {
    throw new ValidationError("Số chiến dịch phải nằm trong khoảng từ 1 đến 1.000.", {
      field: "campaigns",
    });
  }
  if (
    !Number.isInteger(input.interactions) ||
    input.interactions < 100 ||
    input.interactions > 20_000
  ) {
    throw new ValidationError("Số tương tác phải nằm trong khoảng từ 100 đến 20.000.", {
      field: "interactions",
    });
  }
  if (input.coldStartRate < 0 || input.coldStartRate > 0.5) {
    throw new ValidationError("Tỷ lệ KOC cold-start phải nằm trong khoảng từ 0 đến 0,5.", {
      field: "coldStartRate",
    });
  }
};

export const validateGeneratedDataset = (dataset: GeneratedDataset): void => {
  const ids = new Set<string>();
  const addId = (id: string): void => {
    if (ids.has(id)) throw new ValidationError("Dataset chứa ID trùng lặp.", { id });
    ids.add(id);
  };
  for (const product of dataset.products) addId(product.skuId);
  for (const koc of dataset.kocs) addId(koc.kocId);
  for (const campaign of dataset.campaigns) addId(campaign.campaignId);
  for (const result of dataset.campaignResults) addId(result.resultId);
  for (const result of dataset.campaignResults) {
    if (result.revenue !== result.orders * result.sellingPrice) {
      throw new ValidationError("Revenue không nhất quán với orders và sellingPrice.", {
        resultId: result.resultId,
      });
    }
    if (result.orders > result.clicks || result.clicks > result.views) {
      throw new ValidationError("Thứ tự views, clicks, orders không hợp lệ.", {
        resultId: result.resultId,
      });
    }
    if (result.stockAfter < 0) {
      throw new ValidationError("Tồn kho không được âm.", { resultId: result.resultId });
    }
  }
};
