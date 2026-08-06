import type { Page, PageRequest, ProductId } from "./shared";
import { ValidationError } from "./shared";

export const productCategories = [
  "dress",
  "top",
  "bottom",
  "outerwear",
  "accessory",
  "footwear",
] as const;

export type ProductCategory = (typeof productCategories)[number];

export interface Product {
  readonly skuId: ProductId;
  readonly name: string;
  readonly description: string;
  readonly category: ProductCategory;
  readonly brand: string;
  readonly sellingPrice: number;
  readonly stock: number;
  readonly styleTags: readonly string[];
  readonly targetAudience: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateProductInput {
  readonly name: string;
  readonly description: string;
  readonly category: ProductCategory;
  readonly brand: string;
  readonly sellingPrice: number;
  readonly stock: number;
  readonly styleTags: readonly string[];
  readonly targetAudience: readonly string[];
}

export type UpdateProductInput = {
  [Key in keyof CreateProductInput]?: CreateProductInput[Key] | undefined;
};

export interface ProductRepository {
  readonly list: (page: PageRequest) => Promise<Page<Product>>;
  readonly getById: (skuId: ProductId) => Promise<Product | null>;
  readonly create: (product: Product) => Promise<Product>;
  readonly update: (
    skuId: ProductId,
    input: UpdateProductInput,
    updatedAt: string,
  ) => Promise<Product | null>;
  readonly delete: (skuId: ProductId) => Promise<boolean>;
}

export const validateCreateProduct = (input: CreateProductInput): void => {
  if (input.sellingPrice <= 0) {
    throw new ValidationError("Giá bán phải lớn hơn 0.", { field: "sellingPrice" });
  }
  if (!Number.isInteger(input.stock) || input.stock < 0) {
    throw new ValidationError("Tồn kho phải là số nguyên không âm.", { field: "stock" });
  }
  if (input.styleTags.length === 0) {
    throw new ValidationError("SKU phải có ít nhất một nhãn phong cách.", { field: "styleTags" });
  }
  if (input.targetAudience.length === 0) {
    throw new ValidationError("SKU phải có ít nhất một nhóm khách hàng mục tiêu.", {
      field: "targetAudience",
    });
  }
};

export const validateProductPatch = (input: UpdateProductInput): void => {
  if (input.sellingPrice !== undefined && input.sellingPrice <= 0) {
    throw new ValidationError("Giá bán phải lớn hơn 0.", { field: "sellingPrice" });
  }
  if (input.stock !== undefined && (!Number.isInteger(input.stock) || input.stock < 0)) {
    throw new ValidationError("Tồn kho phải là số nguyên không âm.", { field: "stock" });
  }
  if (input.styleTags !== undefined && input.styleTags.length === 0) {
    throw new ValidationError("SKU phải có ít nhất một nhãn phong cách.", { field: "styleTags" });
  }
  if (input.targetAudience !== undefined && input.targetAudience.length === 0) {
    throw new ValidationError("SKU phải có ít nhất một nhóm khách hàng mục tiêu.", {
      field: "targetAudience",
    });
  }
};
