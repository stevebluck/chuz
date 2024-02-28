import { Brand, Effect } from "effect";
import { v4 as uuidv4 } from "uuid";

export type Uuid = string & Brand.Brand<{ readonly Uuid: unique symbol }["Uuid"]>;

export namespace Uuid {
  const Uuid = Brand.nominal<Uuid>();
  export const make: Effect.Effect<Uuid> = Effect.sync(() => Uuid(uuidv4()));
}
