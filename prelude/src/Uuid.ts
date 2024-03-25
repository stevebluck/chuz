import * as S from "@effect/schema/Schema";
import { randomUUID } from "crypto";
import { Brand, Effect } from "effect";

export type Uuid = string & Brand.Brand<{ readonly Uuid: unique symbol }["Uuid"]>;

export namespace Uuid {
  const Uuid = Brand.nominal<Uuid>();
  export const make: Effect.Effect<Uuid> = Effect.sync(() => Uuid(randomUUID()));
  export const schema = S.UUID.pipe(S.fromBrand(Uuid));
}
