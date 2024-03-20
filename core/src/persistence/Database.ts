import { Effect, Scope } from "effect";
import { Kysely, PostgresDialect } from "kysely";
import { DB } from "kysely-codegen";
import { Pool } from "pg";

export type { DB } from "kysely-codegen";

export interface Database extends Kysely<DB> {}

export class PostgressDatabase {
  static make = (connectionString: string) =>
    Effect.acquireRelease(
      Effect.sync(() => new Kysely<DB>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString }) }) })),
      (db) => Effect.sync(() => db.destroy()),
    );
}
