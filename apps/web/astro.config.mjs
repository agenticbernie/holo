import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  session: false,
  adapter: cloudflare({ imageService: "passthrough" }),
  integrations: [react()],
  vite: {
    resolve: {
      dedupe: ["react", "react-dom"],
    },
  },
});
