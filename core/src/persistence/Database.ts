import { Kysely, PostgresDialect, SelectQueryBuilder } from "kysely";
import { DB } from "kysely-codegen";
import { Pool } from "pg";
import { Effect, Option } from "@chuz/prelude";

export type { DB } from "kysely-codegen";

export interface Database {
  query: Kysely<DB>;
  findOne: <A, Table extends keyof DB>(
    name: string,
    query: SelectQueryBuilder<DB, Table, A>,
  ) => Effect.Effect<Option.Option<A>>;
  findOneOrElse: <A, Table extends keyof DB, E>(
    name: string,
    query: SelectQueryBuilder<DB, Table, A>,
    orElse: E,
  ) => Effect.Effect<A, E>;
  findMany: <A, Table extends keyof DB>(
    name: string,
    query: SelectQueryBuilder<DB, Table, A>,
  ) => Effect.Effect<ReadonlyArray<A>>;
  unsafeFindOne: <A, Table extends keyof DB>(name: string, query: SelectQueryBuilder<DB, Table, A>) => Effect.Effect<A>;
}

export class PostgressDatabase implements Database {
  static make = (connectionString: string) => {
    return Effect.acquireRelease(
      Effect.sync(() => new Kysely<DB>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString }) }) })),
      (db) => Effect.sync(() => db.destroy()),
    ).pipe(Effect.map((db) => new PostgressDatabase(db)));
  };

  constructor(public readonly query: Kysely<DB>) {}

  findOne = <A, Table extends keyof DB>(
    name: string,
    query: SelectQueryBuilder<DB, Table, A>,
  ): Effect.Effect<Option.Option<A>> => {
    return Effect.promise(() => query.executeTakeFirst()).pipe(
      Effect.flatMap(Effect.fromNullable),
      Effect.option,
      Effect.withSpan(name),
    );
  };

  findOneOrElse = <A, Table extends keyof DB, E>(
    name: string,
    query: SelectQueryBuilder<DB, Table, A>,
    orElse: E,
  ): Effect.Effect<A, E> => {
    return Effect.promise(() => query.executeTakeFirst()).pipe(
      Effect.flatMap(Effect.fromNullable),
      Effect.option,
      Effect.filterOrFail(Option.isSome, () => orElse),
      Effect.map((opt) => opt.value),
      Effect.withSpan(name),
    );
  };

  findMany = <O, Table extends keyof DB>(
    name: string,
    query: SelectQueryBuilder<DB, Table, O>,
  ): Effect.Effect<ReadonlyArray<O>> => {
    return Effect.promise(() => query.execute()).pipe(Effect.withSpan(name));
  };

  unsafeFindOne = <O, Table extends keyof DB>(
    name: string,
    query: SelectQueryBuilder<DB, Table, O>,
  ): Effect.Effect<O> => {
    return Effect.promise(() => query.executeTakeFirstOrThrow()).pipe(Effect.withSpan(name));
  };
}
