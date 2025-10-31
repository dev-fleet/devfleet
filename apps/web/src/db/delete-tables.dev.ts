import { db } from "@/db";
import { env } from "@/env.mjs";

const reset = async () => {
  if (env.NODE_ENV !== "development") {
    throw new Error("This script can only be used in development mode.");
  }

  console.log("Fetching tables from database...");

  // Disable foreign key checks (PostgreSQL-specific)
  await db.execute("SET session_replication_role = 'replica';");

  // Fetch all table names from the information schema
  const tables = await db.execute<{ table_name: string }>(
    `SELECT table_name 
     FROM information_schema.tables 
     WHERE (table_schema = 'public' OR table_schema = 'drizzle') AND table_type = 'BASE TABLE';`
  );

  const tableNames = tables.map((row) => row.table_name);

  if (tableNames.length > 0) {
    console.log(`Found tables: ${tableNames.join(", ")}`);

    // Iterate over tables and drop them
    for (const table of tableNames) {
      console.log(`Dropping table: ${table}`);
      await db.execute(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
    }
  }

  // Delete all types
  const types = await db.execute<{ type_name: string }>(
    `SELECT t.typname as type_name
       FROM pg_type t
       JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'public'
       AND t.typtype = 'e';`
  );

  const typeNames = types.map((row) => row.type_name);

  if (typeNames.length > 0) {
    console.log(`Found types: ${typeNames.join(", ")}`);

    for (const type of typeNames) {
      console.log(`Dropping type: ${type}`);
      await db.execute(`DROP TYPE IF EXISTS "${type}" CASCADE;`);
    }
  }

  // Re-enable foreign key checks
  await db.execute("SET session_replication_role = 'origin';");
};
reset()
  .then(() => {
    console.log("✨ Database Reset successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Database Resetting failed.");
    console.error(error);
    process.exit(1);
  });
