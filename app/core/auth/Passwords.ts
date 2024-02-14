import * as S from "@effect/schema/Schema";
import * as bcrypt from "bcryptjs";
import { Equivalence, Brand, Effect, Context } from "effect";
import { Refinement } from "~/lib/Refinement";

export namespace Password {
  export type Plaintext = string & Brand.Brand<"PlainText">;
  const PlaintextBrand = Brand.nominal<Plaintext>();

  export namespace Plaintext {
    export const schema = S.NonEmpty.pipe(
      S.message(() => "A password is required"),
      S.fromBrand(PlaintextBrand),
    );

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

  export type Hashed = string & Brand.Brand<"Hashed">;
  const HashedBrand = Brand.nominal<Hashed>();

  export namespace Hashed {
    export const schema = S.string.pipe(S.fromBrand(HashedBrand));
    export const { from, unsafeFrom, is } = Refinement(schema);
    export const equals: Equivalence.Equivalence<Hashed> = Equivalence.strict();
  }
}

export namespace Passwords {
  export type Hasher = (password: Password.Strong) => Effect.Effect<Password.Hashed>;

  export const hasher =
    (bycrptLogRounds: number): Hasher =>
    (password) =>
      Effect.promise(() => bcrypt.hash(password, bycrptLogRounds)).pipe(Effect.map(Password.Hashed.unsafeFrom));

  export const matches = (password: Password.Plaintext, hashed: Password.Hashed): Effect.Effect<boolean> =>
    Effect.promise(() => bcrypt.compare(password, hashed));
}

export class HasherTag extends Context.Tag("Hasher")<HasherTag, Passwords.Hasher>() {}
