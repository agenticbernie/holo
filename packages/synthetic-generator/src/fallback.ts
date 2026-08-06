import type { SemanticKind, SemanticRecord } from "@pipa/llm-client";
import { SeededRandom } from "./random";

const styles = ["minimal", "streetwear", "feminine", "workwear", "vintage", "resort"];
const audiences = ["women-18-24", "women-25-34", "women-35-44", "urban", "office", "students"];

export const fallbackSemanticRecords = (
  kind: SemanticKind,
  count: number,
  seed: number,
): readonly SemanticRecord[] => {
  const random = new SeededRandom(seed + kind.length * 101);
  return Array.from({ length: count }, (_, index) => {
    const style = random.pick(styles);
    const audience = random.pick(audiences);
    return {
      name:
        kind === "product"
          ? `SKU thời trang ${style} ${index + 1}`
          : kind === "koc"
            ? `KOC ${style} ${index + 1}`
            : `Chiến dịch ${style} ${index + 1}`,
      description: `Nội dung mô phỏng theo phong cách ${style}, phù hợp với nhóm ${audience}.`,
      styleTags: [style, random.pick(styles)],
      targetAudience: [audience, "fashion-lovers"],
      bio: `Nhà sáng tạo nội dung tập trung vào ${style} và thời trang ứng dụng.`,
      contentThemes: [style, "styling", "daily-look"],
      ageRange: audience.replace("women-", "") || "25-34",
      genders: ["female"],
      regions: ["urban", "HCMC"],
      interests: [style, "fashion"],
      objective: "Tăng nhận diện và thúc đẩy khám phá SKU.",
      season: random.pick(["spring", "summer", "autumn", "winter"]),
    };
  });
};
