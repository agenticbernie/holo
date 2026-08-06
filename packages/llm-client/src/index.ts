import { Effect } from "effect";
import { z } from "zod";

export type SemanticKind = "product" | "koc" | "campaign";

export interface SemanticGenerationRequest {
  readonly kind: SemanticKind;
  readonly count: number;
  readonly seed: number;
}

export interface SemanticRecord {
  readonly name: string;
  readonly description: string;
  readonly styleTags: readonly string[];
  readonly targetAudience: readonly string[];
  readonly bio: string;
  readonly contentThemes: readonly string[];
  readonly ageRange: string;
  readonly genders: readonly string[];
  readonly regions: readonly string[];
  readonly interests: readonly string[];
  readonly objective: string;
  readonly season: string;
}

export class KimiError extends Error {
  readonly code: "KIMI_UNAVAILABLE" | "KIMI_INVALID_RESPONSE" | "KIMI_REQUEST_FAILED";

  constructor(code: KimiError["code"], message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "KimiError";
    this.code = code;
  }
}

export interface KimiClient {
  readonly generateBatch: (
    request: SemanticGenerationRequest,
  ) => Effect.Effect<readonly SemanticRecord[], KimiError>;
}

const semanticRecordSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  styleTags: z.array(z.string()).min(1),
  targetAudience: z.array(z.string()).min(1),
  bio: z.string().default(""),
  contentThemes: z.array(z.string()).default([]),
  ageRange: z.string().default("25-34"),
  genders: z.array(z.string()).default(["female"]),
  regions: z.array(z.string()).default(["urban"]),
  interests: z.array(z.string()).default([]),
  objective: z.string().default("Tăng nhận diện sản phẩm thời trang."),
  season: z.string().default("all-season"),
});

const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
});

const batchSchema = z.object({ records: z.array(semanticRecordSchema) });

const parseResponse = (value: unknown, count: number): readonly SemanticRecord[] => {
  const response = responseSchema.parse(value);
  const content = response.choices[0]?.message.content;
  if (content === undefined)
    throw new KimiError("KIMI_INVALID_RESPONSE", "Kimi không trả về nội dung.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new KimiError("KIMI_INVALID_RESPONSE", "Nội dung Kimi không phải JSON hợp lệ.", {
      cause: error instanceof Error ? error : undefined,
    });
  }
  const records = batchSchema.parse(parsed).records;
  if (records.length !== count) {
    throw new KimiError("KIMI_INVALID_RESPONSE", "Số bản ghi semantic không khớp yêu cầu.");
  }
  return records;
};

const promptFor = (request: SemanticGenerationRequest): string =>
  [
    "Bạn là trợ lý dữ liệu cho nền tảng thời trang Pipa.",
    `Tạo đúng ${request.count} bản ghi loại ${request.kind}. Seed tham chiếu: ${request.seed}.`,
    'Chỉ trả về JSON có dạng {"records":[...]}, không markdown.',
    "Mỗi record phải có name, description, styleTags, targetAudience, bio, contentThemes, ageRange, genders, regions, interests, objective, season.",
    "Không tạo số liệu tài chính, lượt xem, đơn hàng, doanh thu, ROI, CTR, conversion, inventory hoặc followers.",
    "Viết nội dung thực tế bằng tiếng Việt, các tag ngắn bằng tiếng Anh.",
  ].join(" ");

const requestWithRetry = async (
  fetchImpl: typeof fetch,
  baseUrl: string,
  apiKey: string,
  model: string,
  request: SemanticGenerationRequest,
): Promise<readonly SemanticRecord[]> => {
  let lastError: KimiError | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: promptFor(request) }],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new KimiError("KIMI_REQUEST_FAILED", `Kimi trả về HTTP ${response.status}.`);
      }
      return parseResponse(await response.json(), request.count);
    } catch (error) {
      lastError =
        error instanceof KimiError
          ? error
          : new KimiError("KIMI_UNAVAILABLE", "Không thể kết nối Kimi.", {
              cause: error instanceof Error ? error : undefined,
            });
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new KimiError("KIMI_UNAVAILABLE", "Kimi không khả dụng.");
};

export const createKimiClient = (options: {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly fetchImpl?: typeof fetch;
}): KimiClient => ({
  generateBatch: (request) =>
    Effect.tryPromise({
      try: () =>
        requestWithRetry(
          options.fetchImpl ?? fetch,
          options.baseUrl,
          options.apiKey,
          options.model,
          request,
        ),
      catch: (error) =>
        error instanceof KimiError
          ? error
          : new KimiError("KIMI_UNAVAILABLE", "Kimi không khả dụng.", {
              cause: error instanceof Error ? error : undefined,
            }),
    }),
});
