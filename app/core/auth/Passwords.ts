import * as S from "@effect/schema/Schema";
import * as bcrypt from "bcryptjs";
import { Equivalence, Brand, Effect, Context } from "effect";
import { Refinement } from "~/lib/Refinement";

export namespace Password {
  export type Plaintext = string & Brand.Brand<"PlainText">;
  const PlaintextBrand = Brand.nominal<Plaintext>();

  export namespace Plaintext {
    export const schema = S.string.pipe(S.minLength(1), S.fromBrand(PlaintextBrand));

    export const { from, unsafeFrom, is } = Refinement(schema);

    export const fromStrong = (password: Strong): Plaintext => unsafeFrom(password);
  }

  export type Strong = string & Brand.Brand<"Strong">;
  const StrongBrand = Brand.nominal<Strong>();

  export namespace Strong {
    export const schema = S.string.pipe(S.minLength(8), S.maxLength(64), S.fromBrand(StrongBrand));

    export const toPlaintext = (password: Strong): Plaintext => Plaintext.unsafeFrom(password);

    export const { from, unsafeFrom, is } = Refinement(schema);
  }
}

export namespace Passwords {
  export type Hashed = string & Brand.Brand<"Hashed">;

  export namespace Hashed {
    export const unsafeFrom = (a: string): Hashed => Brand.nominal<Hashed>()(a);
  }

  export type Hasher = (password: Password.Strong) => Effect.Effect<Hashed>;

  export const hasher =
    (bycrptLogRounds: number): Hasher =>
    (password) =>
      Effect.promise(() => bcrypt.hash(password, bycrptLogRounds)).pipe(Effect.map(Hashed.unsafeFrom));

  export const matches = (password: Password.Plaintext, hashed: Hashed): Effect.Effect<boolean> =>
    Effect.promise(() => bcrypt.compare(password, hashed));

  export const equals: Equivalence.Equivalence<Hashed> = Equivalence.strict();
}

export class HasherTag extends Context.Tag("Hasher")<HasherTag, Passwords.Hasher>() {}
