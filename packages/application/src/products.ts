import {
  type CreateProductInput,
  NotFoundError,
  type Product,
  type ProductId,
  type ProductRepository,
  type UpdateProductInput,
  validateCreateProduct,
  validateProductPatch,
} from "@holo/domain";
import type { ApplicationRuntime } from "./common";

export interface ProductApplication {
  readonly list: (
    limit?: number,
    offset?: number,
  ) => Promise<Awaited<ReturnType<ProductRepository["list"]>>>;
  readonly get: (skuId: ProductId) => Promise<Product>;
  readonly create: (input: CreateProductInput) => Promise<Product>;
  readonly update: (skuId: ProductId, input: UpdateProductInput) => Promise<Product>;
  readonly remove: (skuId: ProductId) => Promise<void>;
}

export const createProductApplication = (
  repository: ProductRepository,
  runtime: ApplicationRuntime,
): ProductApplication => ({
  list: (limit, offset) => repository.list({ limit: limit ?? 50, offset: offset ?? 0 }),
  get: async (skuId) => {
    const product = await repository.getById(skuId);
    if (product === null) throw new NotFoundError("SKU", skuId);
    return product;
  },
  create: async (input) => {
    validateCreateProduct(input);
    const timestamp = runtime.clock.now();
    return repository.create({
      ...input,
      skuId: runtime.ids.next("sku"),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
  update: async (skuId, input) => {
    validateProductPatch(input);
    const product = await repository.update(skuId, input, runtime.clock.now());
    if (product === null) throw new NotFoundError("SKU", skuId);
    return product;
  },
  remove: async (skuId) => {
    if (!(await repository.delete(skuId))) throw new NotFoundError("SKU", skuId);
  },
});
