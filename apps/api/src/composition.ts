import {
  createCampaignApplication,
  createDatasetApplication,
  createKocApplication,
  createProductApplication,
  createRecommendationApplication,
  type DatasetQueue,
} from "@pipa/application";
import { loadRuntimeConfig } from "@pipa/config";
import {
  createCampaignRepository,
  createCampaignResultRepository,
  createDatasetJobRepository,
  createKocRepository,
  createProductRepository,
} from "@pipa/database";
import { createKimiClient } from "@pipa/llm-client";
import { createR2ArtifactStorage } from "@pipa/storage";
import type { AppDependencies } from "./types";

export const createProductionDependencies = (env: Env): AppDependencies => {
  const runtimeEnv = env as Env & { KIMI_API_KEY?: string };
  const config = loadRuntimeConfig({
    ENVIRONMENT: env.ENVIRONMENT,
    KIMI_API_KEY: runtimeEnv.KIMI_API_KEY,
    KIMI_API_BASE_URL: env.KIMI_API_BASE_URL,
    KIMI_MODEL: env.KIMI_MODEL,
  });
  const runtime = {
    clock: { now: () => new Date().toISOString() },
    ids: { next: (prefix: string) => `${prefix}_${crypto.randomUUID()}` },
  };
  const productsRepository = createProductRepository(env.DB);
  const kocsRepository = createKocRepository(env.DB);
  const campaignsRepository = createCampaignRepository(env.DB);
  const campaignResultsRepository = createCampaignResultRepository(env.DB);
  const datasetJobsRepository = createDatasetJobRepository(env.DB);
  const storage = createR2ArtifactStorage({
    put: async (key, body, contentType) => {
      await env.DATASETS_BUCKET.put(key, body, { httpMetadata: { contentType } });
    },
    get: async (key) => {
      const object = await env.DATASETS_BUCKET.get(key);
      if (object === null || object.body === null) return null;
      return {
        body: object.body as ReadableStream<Uint8Array>,
        contentType: object.httpMetadata?.contentType ?? null,
        size: object.size,
      };
    },
  });
  const kimi = config.KIMI_API_KEY
    ? createKimiClient({
        apiKey: config.KIMI_API_KEY,
        baseUrl: config.KIMI_API_BASE_URL,
        model: config.KIMI_MODEL,
      })
    : undefined;
  const queue: DatasetQueue = {
    send: async (message) => {
      await env.DATASET_QUEUE.send(message);
    },
  };
  const products = createProductApplication(productsRepository, runtime);
  const kocs = createKocApplication(kocsRepository, runtime);
  const campaigns = createCampaignApplication(
    campaignsRepository,
    campaignResultsRepository,
    runtime,
  );
  const recommendations = createRecommendationApplication({
    products: productsRepository,
    kocs: kocsRepository,
    campaigns: campaignsRepository,
    results: campaignResultsRepository,
  });
  const datasets = createDatasetApplication({
    jobs: datasetJobsRepository,
    storage,
    queue,
    runtime,
    ...(kimi === undefined ? {} : { kimi }),
  });
  return {
    products,
    kocs,
    campaigns,
    recommendations,
    datasets,
    campaignResults: campaignResultsRepository,
    datasetJobs: datasetJobsRepository,
    storage,
  };
};
