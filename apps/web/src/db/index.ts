import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { env } from "@/env.mjs";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// Need a singleton to store the database connection in development
declare global {
  var db: PostgresJsDatabase<typeof schema> | undefined;
}

let db: PostgresJsDatabase<typeof schema>;
const client = postgres(
  env.DATABASE_URL!,
  // To enable connection pooling `prepare` is set to `false`
  // to disable prefetch as it is not supported for "Transaction" pool mode
  { prepare: env.NODE_ENV === "development" ? true : false }
);

if (env.NODE_ENV === "development") {
  if (!global.db)
    global.db = drizzle(client, {
      logger: true,
      schema,
    });
  db = global.db;
} else {
  db = drizzle(client, { schema });
}

export { db };
