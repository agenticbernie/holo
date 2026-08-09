import type { AudienceProfile } from "@holo/domain";

export const serializeStringArray = (value: readonly string[]): string => JSON.stringify(value);

export const parseAudienceProfile = (value: string): AudienceProfile => {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null) throw new Error("Invalid audience JSON");
  const record = parsed as Record<string, unknown>;
  if (
    typeof record.ageRange !== "string" ||
    !Array.isArray(record.genders) ||
    !Array.isArray(record.regions) ||
    !Array.isArray(record.interests) ||
    !record.genders.every((item) => typeof item === "string") ||
    !record.regions.every((item) => typeof item === "string") ||
    !record.interests.every((item) => typeof item === "string")
  ) {
    throw new Error("Invalid audience JSON");
  }
  return {
    ageRange: record.ageRange,
    genders: record.genders,
    regions: record.regions,
    interests: record.interests,
  };
};

export const parseWarnings = <T>(value: string): readonly T[] => {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error("Invalid warnings JSON");
  return parsed as readonly T[];
};
