import { Effect } from "effect";
export class StorageError extends Error {
  readonly code = "STORAGE_ERROR";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "StorageError";
  }
}

export interface StoredArtifact {
  readonly key: string;
  readonly body: ReadableStream<Uint8Array>;
  readonly contentType: string | null;
  readonly size: number | null;
}

export interface ArtifactStorage {
  readonly put: (
    key: string,
    body: string | ArrayBuffer,
    contentType: string,
  ) => Effect.Effect<void, StorageError>;
  readonly get: (key: string) => Effect.Effect<StoredArtifact | null, StorageError>;
}

export interface R2BucketAdapter {
  readonly put: (key: string, body: string | ArrayBuffer, contentType: string) => Promise<void>;
  readonly get: (key: string) => Promise<{
    readonly body: ReadableStream<Uint8Array>;
    readonly contentType: string | null;
    readonly size: number;
  } | null>;
}

export const createR2ArtifactStorage = (bucket: R2BucketAdapter): ArtifactStorage => ({
  put: (key, body, contentType) =>
    Effect.tryPromise({
      try: async () => {
        await bucket.put(key, body, contentType);
      },
      catch: (error) =>
        new StorageError(`Không thể ghi artifact ${key}.`, {
          cause: error instanceof Error ? error : undefined,
        }),
    }),
  get: (key) =>
    Effect.tryPromise({
      try: async () => {
        const object = await bucket.get(key);
        if (object === null) return null;
        return {
          key,
          body: object.body,
          contentType: object.contentType,
          size: object.size,
        };
      },
      catch: (error) =>
        new StorageError(`Không thể đọc artifact ${key}.`, {
          cause: error instanceof Error ? error : undefined,
        }),
    }),
});
