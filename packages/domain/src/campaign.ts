import type { CampaignId, CampaignResultId, KocId, Page, PageRequest, ProductId } from "./shared";
import { ValidationError } from "./shared";

export const campaignStatuses = [
  "draft",
  "scheduled",
  "running",
  "completed",
  "cancelled",
] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

export interface Campaign {
  readonly campaignId: CampaignId;
  readonly name: string;
  readonly objective: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly promotionRate: number;
  readonly season: string;
  readonly status: CampaignStatus;
  readonly budget: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCampaignInput {
  readonly name: string;
  readonly objective: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly promotionRate: number;
  readonly season: string;
  readonly status: CampaignStatus;
  readonly budget: number;
}

export type UpdateCampaignInput = {
  [Key in keyof CreateCampaignInput]?: CreateCampaignInput[Key] | undefined;
};

export interface CampaignResult {
  readonly resultId: CampaignResultId;
  readonly campaignId: CampaignId;
  readonly skuId: ProductId;
  readonly kocId: KocId;
  readonly views: number;
  readonly clicks: number;
  readonly orders: number;
  readonly returns: number;
  readonly revenue: number;
  readonly sellingPrice: number;
  readonly stockBefore: number;
  readonly stockAfter: number;
  readonly spend: number;
  readonly roi: number;
  readonly scenario: string;
  readonly createdAt: string;
}

export interface CreateCampaignResultInput {
  readonly campaignId: CampaignId;
  readonly skuId: ProductId;
  readonly kocId: KocId;
  readonly views: number;
  readonly clicks: number;
  readonly orders: number;
  readonly returns: number;
  readonly sellingPrice: number;
  readonly stockBefore: number;
  readonly stockAfter: number;
  readonly spend: number;
  readonly scenario: string;
}

export interface CampaignRepository {
  readonly list: (page: PageRequest) => Promise<Page<Campaign>>;
  readonly getById: (campaignId: CampaignId) => Promise<Campaign | null>;
  readonly create: (campaign: Campaign) => Promise<Campaign>;
  readonly update: (
    campaignId: CampaignId,
    input: UpdateCampaignInput,
    updatedAt: string,
  ) => Promise<Campaign | null>;
  readonly delete: (campaignId: CampaignId) => Promise<boolean>;
}

export interface CampaignResultRepository {
  readonly listByCampaign: (
    campaignId: CampaignId,
    page: PageRequest,
  ) => Promise<Page<CampaignResult>>;
  readonly listBySkuAndKoc: (
    skuId: ProductId,
    kocId: KocId,
    page: PageRequest,
  ) => Promise<Page<CampaignResult>>;
  readonly create: (result: CampaignResult) => Promise<CampaignResult>;
}

export const validateCreateCampaign = (input: CreateCampaignInput): void => {
  if (input.endDate < input.startDate) {
    throw new ValidationError("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.", {
      field: "endDate",
    });
  }
  if (input.promotionRate < 0 || input.promotionRate > 1) {
    throw new ValidationError("Tỷ lệ khuyến mãi phải nằm trong khoảng từ 0 đến 1.", {
      field: "promotionRate",
    });
  }
  if (input.budget < 0) {
    throw new ValidationError("Ngân sách không được âm.", { field: "budget" });
  }
};

export const validateCampaignPatch = (input: UpdateCampaignInput): void => {
  if (input.promotionRate !== undefined && (input.promotionRate < 0 || input.promotionRate > 1)) {
    throw new ValidationError("Tỷ lệ khuyến mãi phải nằm trong khoảng từ 0 đến 1.", {
      field: "promotionRate",
    });
  }
  if (input.budget !== undefined && input.budget < 0) {
    throw new ValidationError("Ngân sách không được âm.", { field: "budget" });
  }
};

export const validateCampaignResult = (input: CreateCampaignResultInput): void => {
  if (input.views < 0 || input.clicks < 0 || input.orders < 0 || input.returns < 0) {
    throw new ValidationError("Các chỉ số chiến dịch không được âm.");
  }
  if (input.clicks > input.views) {
    throw new ValidationError("Clicks không được lớn hơn views.", { field: "clicks" });
  }
  if (input.orders > input.clicks) {
    throw new ValidationError("Orders không được lớn hơn clicks.", { field: "orders" });
  }
  if (input.returns > input.orders) {
    throw new ValidationError("Returns không được lớn hơn orders.", { field: "returns" });
  }
  if (input.stockBefore < 0 || input.stockAfter < 0 || input.stockAfter > input.stockBefore) {
    throw new ValidationError("Tồn kho sau chiến dịch không hợp lệ.", { field: "stockAfter" });
  }
  if (input.orders > input.stockBefore - input.stockAfter) {
    throw new ValidationError("Số đơn vượt quá lượng hàng đã xuất kho.", { field: "orders" });
  }
  if (input.sellingPrice <= 0 || input.spend < 0) {
    throw new ValidationError("Giá bán phải dương và chi phí không được âm.");
  }
};

export const calculateCampaignResult = (input: CreateCampaignResultInput): CampaignResult => {
  validateCampaignResult(input);
  const revenue = input.orders * input.sellingPrice;
  const roi = input.spend === 0 ? 0 : (revenue - input.spend) / input.spend;
  return {
    ...input,
    resultId: "",
    revenue,
    roi,
    createdAt: "",
  };
};
