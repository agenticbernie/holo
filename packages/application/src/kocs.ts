import {
  type CreateKocInput,
  type Koc,
  type KocId,
  type KocRepository,
  NotFoundError,
  type UpdateKocInput,
  validateCreateKoc,
  validateKocPatch,
} from "@holo/domain";
import type { ApplicationRuntime } from "./common";

export interface KocApplication {
  readonly list: (
    limit?: number,
    offset?: number,
  ) => Promise<Awaited<ReturnType<KocRepository["list"]>>>;
  readonly get: (kocId: KocId) => Promise<Koc>;
  readonly create: (input: CreateKocInput) => Promise<Koc>;
  readonly update: (kocId: KocId, input: UpdateKocInput) => Promise<Koc>;
  readonly remove: (kocId: KocId) => Promise<void>;
}

export const createKocApplication = (
  repository: KocRepository,
  runtime: ApplicationRuntime,
): KocApplication => ({
  list: (limit, offset) => repository.list({ limit: limit ?? 50, offset: offset ?? 0 }),
  get: async (kocId) => {
    const koc = await repository.getById(kocId);
    if (koc === null) throw new NotFoundError("KOC", kocId);
    return koc;
  },
  create: async (input) => {
    validateCreateKoc(input);
    const timestamp = runtime.clock.now();
    return repository.create({
      ...input,
      kocId: runtime.ids.next("koc"),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },
  update: async (kocId, input) => {
    validateKocPatch(input);
    const koc = await repository.update(kocId, input, runtime.clock.now());
    if (koc === null) throw new NotFoundError("KOC", kocId);
    return koc;
  },
  remove: async (kocId) => {
    if (!(await repository.delete(kocId))) throw new NotFoundError("KOC", kocId);
  },
});
