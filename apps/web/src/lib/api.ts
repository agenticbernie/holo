import { createHoloApiClient } from "@holo/api-client";

export const holoApi = createHoloApiClient(
  import.meta.env.PUBLIC_HOLO_API_BASE_URL ?? "https://holo-api.hackonteam.workers.dev",
);
