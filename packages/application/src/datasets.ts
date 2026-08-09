import {
  ConflictError,
  type DatasetGenerationParameters,
  type DatasetJob,
  type DatasetJobRepository,
  defaultDatasetParameters,
  NotFoundError,
  validateDatasetParameters,
} from "@holo/domain";
import type { KimiClient } from "@holo/llm-client";
import type { ArtifactStorage, StoredArtifact } from "@holo/storage";
import { generateSyntheticDataset } from "@holo/synthetic-generator";
import { Effect } from "effect";
import type { ApplicationRuntime } from "./common";

export interface DatasetQueueMessage {
  readonly type: "dataset.generate";
  readonly jobId: string;
  readonly requestId: string;
}

export interface DatasetQueue {
  readonly send: (message: DatasetQueueMessage) => Promise<void>;
}

export interface DatasetApplication {
  readonly start: (
    input: DatasetParametersInput | undefined,
    requestId: string,
  ) => Promise<DatasetJob>;
  readonly get: (jobId: string) => Promise<DatasetJob>;
  readonly process: (message: DatasetQueueMessage, semanticProvider?: KimiClient) => Promise<void>;
  readonly artifact: (
    jobId: string,
    format: "json" | "jsonl" | "csv",
  ) => Promise<StoredArtifact | null>;
}

export type DatasetParametersInput = {
  [Key in keyof DatasetGenerationParameters]?: DatasetGenerationParameters[Key] | undefined;
};

const csvEscape = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const createDatasetApplication = (dependencies: {
  readonly jobs: DatasetJobRepository;
  readonly storage: ArtifactStorage;
  readonly queue: DatasetQueue;
  readonly runtime: ApplicationRuntime;
  readonly kimi?: KimiClient;
}): DatasetApplication => ({
  start: async (input, requestId) => {
    const provided = Object.fromEntries(
      Object.entries(input ?? {}).filter(([, value]) => value !== undefined),
    ) as Partial<DatasetGenerationParameters>;
    const parameters: DatasetGenerationParameters = { ...defaultDatasetParameters, ...provided };
    validateDatasetParameters(parameters);
    const now = dependencies.runtime.clock.now();
    const job: DatasetJob = {
      jobId: dependencies.runtime.ids.next("dataset"),
      status: "queued",
      parameters,
      fallbackUsed: false,
      warnings: [],
      artifactKey: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
    };
    const created = await dependencies.jobs.create(job);
    try {
      await dependencies.queue.send({ type: "dataset.generate", jobId: created.jobId, requestId });
      return created;
    } catch (error) {
      await dependencies.jobs.update(created.jobId, {
        status: "failed",
        errorMessage: "Không thể đưa job vào Queue.",
        updatedAt: dependencies.runtime.clock.now(),
      });
      throw error;
    }
  },
  get: async (jobId) => {
    const job = await dependencies.jobs.getById(jobId);
    if (job === null) throw new NotFoundError("Dataset job", jobId);
    return job;
  },
  process: async (message, semanticProvider) => {
    const job = await dependencies.jobs.getById(message.jobId);
    if (job === null) throw new NotFoundError("Dataset job", message.jobId);
    await dependencies.jobs.update(job.jobId, {
      status: "running",
      updatedAt: dependencies.runtime.clock.now(),
    });
    try {
      const generated = await generateSyntheticDataset(job.parameters, {
        now: dependencies.runtime.clock.now(),
        requestId: message.requestId,
        ...((semanticProvider ?? dependencies.kimi) === undefined
          ? {}
          : { semanticProvider: semanticProvider ?? dependencies.kimi }),
      });
      const baseKey = `datasets/${job.jobId}`;
      const jsonKey = `${baseKey}.json`;
      const jsonlKey = `${baseKey}.jsonl`;
      const csvKey = `${baseKey}.csv`;
      const json = JSON.stringify(generated.dataset);
      const jsonl = [
        ...generated.dataset.products.map((item) =>
          JSON.stringify({ entityType: "product", data: item }),
        ),
        ...generated.dataset.kocs.map((item) => JSON.stringify({ entityType: "koc", data: item })),
        ...generated.dataset.campaigns.map((item) =>
          JSON.stringify({ entityType: "campaign", data: item }),
        ),
        ...generated.dataset.campaignResults.map((item) =>
          JSON.stringify({ entityType: "campaign_result", data: item }),
        ),
      ].join("\n");
      const csvRows = generated.dataset.campaignResults.map((result) =>
        [
          result.resultId,
          result.campaignId,
          result.skuId,
          result.kocId,
          result.views,
          result.clicks,
          result.orders,
          result.returns,
          result.revenue,
          result.sellingPrice,
          result.stockBefore,
          result.stockAfter,
          result.spend,
          result.roi,
          result.scenario,
        ]
          .map(csvEscape)
          .join(","),
      );
      const csv = [
        "resultId,campaignId,skuId,kocId,views,clicks,orders,returns,revenue,sellingPrice,stockBefore,stockAfter,spend,roi,scenario",
        ...csvRows,
      ].join("\n");
      await Effect.runPromise(dependencies.storage.put(jsonKey, json, "application/json"));
      await Effect.runPromise(dependencies.storage.put(jsonlKey, jsonl, "application/x-ndjson"));
      await Effect.runPromise(dependencies.storage.put(csvKey, csv, "text/csv"));
      await dependencies.jobs.update(job.jobId, {
        status: "completed",
        fallbackUsed: generated.fallbackUsed,
        warnings: generated.dataset.warnings,
        artifactKey: jsonKey,
        errorMessage: null,
        updatedAt: dependencies.runtime.clock.now(),
      });
    } catch (error) {
      await dependencies.jobs.update(job.jobId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Dataset generation failed.",
        updatedAt: dependencies.runtime.clock.now(),
      });
      throw error;
    }
  },
  artifact: async (jobId, format) => {
    const job = await dependencies.jobs.getById(jobId);
    if (job === null) throw new NotFoundError("Dataset job", jobId);
    if (job.status !== "completed" || job.artifactKey === null) {
      throw new ConflictError("Dataset chưa hoàn tất.", { jobId });
    }
    const key = job.artifactKey.replace(/\.json$/, `.${format}`);
    return Effect.runPromise(dependencies.storage.get(key));
  },
});
