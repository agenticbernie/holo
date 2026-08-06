import type { KocId, Page, PageRequest } from "./shared";
import { ValidationError } from "./shared";

export interface AudienceProfile {
  readonly ageRange: string;
  readonly genders: readonly string[];
  readonly regions: readonly string[];
  readonly interests: readonly string[];
}

export interface Koc {
  readonly kocId: KocId;
  readonly displayName: string;
  readonly bio: string;
  readonly followers: number;
  readonly averageViews: number;
  readonly engagementRate: number;
  readonly historicalConversionRate: number;
  readonly audienceProfile: AudienceProfile;
  readonly styleTags: readonly string[];
  readonly isColdStart: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateKocInput {
  readonly displayName: string;
  readonly bio: string;
  readonly followers: number;
  readonly averageViews: number;
  readonly engagementRate: number;
  readonly historicalConversionRate: number;
  readonly audienceProfile: AudienceProfile;
  readonly styleTags: readonly string[];
  readonly isColdStart: boolean;
}

export type UpdateKocInput = {
  [Key in keyof CreateKocInput]?: CreateKocInput[Key] | undefined;
};

export interface KocRepository {
  readonly list: (page: PageRequest) => Promise<Page<Koc>>;
  readonly getById: (kocId: KocId) => Promise<Koc | null>;
  readonly create: (koc: Koc) => Promise<Koc>;
  readonly update: (kocId: KocId, input: UpdateKocInput, updatedAt: string) => Promise<Koc | null>;
  readonly delete: (kocId: KocId) => Promise<boolean>;
}

const validateRate = (value: number, field: string): void => {
  if (value < 0 || value > 1) {
    throw new ValidationError(`${field} phải nằm trong khoảng từ 0 đến 1.`, { field });
  }
};

export const validateCreateKoc = (input: CreateKocInput): void => {
  if (!Number.isInteger(input.followers) || input.followers < 0) {
    throw new ValidationError("Số người theo dõi phải là số nguyên không âm.", {
      field: "followers",
    });
  }
  if (!Number.isInteger(input.averageViews) || input.averageViews < 0) {
    throw new ValidationError("Lượt xem trung bình phải là số nguyên không âm.", {
      field: "averageViews",
    });
  }
  validateRate(input.engagementRate, "engagementRate");
  validateRate(input.historicalConversionRate, "historicalConversionRate");
  if (input.styleTags.length === 0) {
    throw new ValidationError("KOC phải có ít nhất một nhãn phong cách.", { field: "styleTags" });
  }
};

export const validateKocPatch = (input: UpdateKocInput): void => {
  if (
    input.followers !== undefined &&
    (!Number.isInteger(input.followers) || input.followers < 0)
  ) {
    throw new ValidationError("Số người theo dõi phải là số nguyên không âm.", {
      field: "followers",
    });
  }
  if (
    input.averageViews !== undefined &&
    (!Number.isInteger(input.averageViews) || input.averageViews < 0)
  ) {
    throw new ValidationError("Lượt xem trung bình phải là số nguyên không âm.", {
      field: "averageViews",
    });
  }
  if (input.engagementRate !== undefined) validateRate(input.engagementRate, "engagementRate");
  if (input.historicalConversionRate !== undefined) {
    validateRate(input.historicalConversionRate, "historicalConversionRate");
  }
  if (input.styleTags !== undefined && input.styleTags.length === 0) {
    throw new ValidationError("KOC phải có ít nhất một nhãn phong cách.", { field: "styleTags" });
  }
};
