import * as S from "@effect/schema/Schema";
import { Brand, Context, Data, Effect } from "effect";
import { Refinement } from "~/lib/Refinement";
import { Id, Identified } from "../Identified";
import { Credentials } from "../auth/Credentials";
import { Password, Passwords } from "../auth/Passwords";
import { Session } from "../auth/Session";
import { Email } from "../emails/Email";
import { NoSuchToken, Token } from "../tokens/Tokens";

export class UsersTag extends Context.Tag("Users")<UsersTag, Users>() {}

export interface Users {
  register(
    credentials: Credentials.Secure,
    firstName: User.FirstName,
    lastName: User.LastName,
    optInMarketing: User.OptInMarketing,
  ): Effect.Effect<Session<User>, Email.AlreadyInUse>;

  findById(id: Id<User>): Effect.Effect<Identified<User>, User.NotFound>;

  findByEmail(email: Email): Effect.Effect<Identified<User>, User.NotFound>;

  identify(token: Token<Id<User>>): Effect.Effect<Session<User>, NoSuchToken>;

  authenticate(credentials: Credentials.Plain): Effect.Effect<Session<User>, Credentials.NotRecognised>;

  logout(token: Token<Id<User>>): Effect.Effect<void>;

  update(id: Id<User>, partial: User.Draft): Effect.Effect<Identified<User>, User.NotFound>;

  updateEmail(id: Id<User>, email: Email): Effect.Effect<Identified<User>, User.UpdateEmailError>;

  updatePassword(
    token: Token<Id<User>>,
    currentPassword: Password.Plaintext,
    updatedPasword: Passwords.Hashed,
  ): Effect.Effect<void, Credentials.NotRecognised | User.NotFound>;

  requestPasswordReset(email: Email): Effect.Effect<Token<[Email, Id<User>]>, Credentials.NotRecognised>;

  resetPassword(
    token: Token<[Email, Id<User>]>,
    password: Passwords.Hashed,
  ): Effect.Effect<Identified<User>, NoSuchToken>;
}

export interface User {
  firstName: User.FirstName;
  lastName: User.LastName;
  email: Email;
  optInMarketing: User.OptInMarketing;
}

export namespace User {
  export const make = (firstName: FirstName, lastName: LastName, email: Email, optInMarketing: OptInMarketing) =>
    Data.case<User>()({ firstName, lastName, email, optInMarketing });

  export type OptInMarketing = boolean & Brand.Brand<"OptInMarketing">;
  export const OptInMarketing = Brand.nominal<OptInMarketing>();

  export type FirstName = string & Brand.Brand<"FirstName">;
  export namespace FirstName {
    export const schema = S.string.pipe(S.minLength(1), S.maxLength(100), S.fromBrand(Brand.nominal<FirstName>()));
    export const { from, is, unsafeFrom } = Refinement(schema);
  }

  export type LastName = string & Brand.Brand<"LastName">;
  export namespace LastName {
    export const schema = S.string.pipe(S.minLength(1), S.maxLength(100), S.fromBrand(Brand.nominal<LastName>()));
    export const { from, is, unsafeFrom } = Refinement(schema);
  }

  export type Draft = Partial<Omit<User, "email">>;

  export type UpdateEmailError = User.NotFound | Email.AlreadyInUse;

  export class NotFound extends Data.TaggedError("UserNotFound") {}
}
