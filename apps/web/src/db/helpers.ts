import { SQL, getTableColumns, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

export function buildConflictUpdateColumns<
  T extends PgTable,
  Q extends keyof T["_"]["columns"],
>(table: T, columns: Q[]): Record<Q, SQL> {
  const cls = getTableColumns(table);
  return columns.reduce(
    (acc, column) => {
      const colName = cls[column]!.name;
      acc[column] = sql.raw(`excluded.${colName}`);
      return acc;
    },
    {} as Record<Q, SQL>
  );
}
