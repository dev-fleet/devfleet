import { env, isProd } from "./env.mjs";
import posthog from "posthog-js";

if (isProd) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "https://r.devfleet.ai/cG9zd/",
    ui_host: "https://us.posthog.com",
    defaults: "2025-05-24",
  });
}
