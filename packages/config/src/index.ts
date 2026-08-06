import { z } from "zod";

const environmentSchema = z.object({
  ENVIRONMENT: z.enum(["development", "test", "staging", "production"]).default("development"),
  KIMI_API_KEY: z.string().optional(),
  KIMI_API_BASE_URL: z.url().default("https://api.moonshot.ai/v1"),
  KIMI_MODEL: z.string().default("kimi-k2.6"),
});

export type RuntimeConfig = z.infer<typeof environmentSchema>;

export const loadRuntimeConfig = (env: Record<string, string | undefined>): RuntimeConfig =>
  environmentSchema.parse(env);
