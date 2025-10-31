import { defineConfig } from "drizzle-kit";
import { env } from "@/env.mjs";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  migrations: {
    schema: "public",
  },
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
