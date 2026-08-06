import type { Clock, IdGenerator, PageRequest } from "@pipa/domain";

export interface ApplicationRuntime {
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export const toPageRequest = (limit = 50, offset = 0): PageRequest => ({
  limit: Math.min(Math.max(limit, 1), 250),
  offset: Math.max(offset, 0),
});
