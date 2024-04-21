import { Credential, Password, Token } from "@chuz/domain";
import { User } from "@chuz/domain";
import { Data, Effect, S } from "@chuz/prelude";
import { EmailAddress } from "@chuz/prelude/src/Schema";

export interface Users {
  register(registration: Registration): Effect.Effect<User.Session, EmailAlreadyInUse>;

  identify(token: User.Token): Effect.Effect<User.Session, Token.NoSuchToken>;

  authenticate(credential: Credential.Plain): Effect.Effect<User.Session, Credential.NotRecognised>;

  logout(token: User.Token): Effect.Effect<void>;

  identities(id: User.Id): Effect.Effect<User.identity.Identities>;

  getById(id: User.Id): Effect.Effect<User.Identified, UserNotFound>;

  getByEmail(email: EmailAddress): Effect.Effect<User.Identified, UserNotFound>;

  update(id: User.Id, partial: User.Partial): Effect.Effect<User.Identified, UserNotFound>;

  updateEmail(id: User.Id, email: EmailAddress): Effect.Effect<User.Identified, UpdateEmailError>;

  setPassword(token: User.Token, password: Password.Hashed): Effect.Effect<void, SetPasswordError>;

  removePassword(token: User.Token): Effect.Effect<void, RemovePasswordError>;

  updatePassword(
    token: User.Token,
    currentPassword: Password.Plaintext,
    updatedPasword: Password.Hashed,
  ): Effect.Effect<void, UpdatePasswordError>;

  requestPasswordReset(
    email: EmailAddress,
  ): Effect.Effect<Token.Token<[EmailAddress, User.Id]>, Credential.NotRecognised>;

  resetPassword(
    token: Token.Token<[EmailAddress, User.Id]>,
    password: Password.Hashed,
  ): Effect.Effect<User.Identified, Token.NoSuchToken>;

  addSocialCredential(
    token: User.Token,
    credential: Credential.Social,
  ): Effect.Effect<Array<Credential.Social>, AddCredentialError>;

  removeSocialCredential(
    token: User.Token,
    id: Credential.SocialId,
  ): Effect.Effect<Array<Credential.Social>, RemoveCredentialError>;
}

export class PasswordAlreadySet extends Data.TaggedError("PasswordAlreadySet") {}
export class UserNotFound extends Data.TaggedError("UserNotFound") {}
export class EmailAlreadyInUse extends Data.TaggedError("EmailAlreadyInUse")<{ email: S.EmailAddress }> {}

export type UpdateEmailError = UserNotFound | EmailAlreadyInUse;
export type UpdatePasswordError = Token.NoSuchToken | Credential.NotRecognised;
export type SetPasswordError = Token.NoSuchToken | PasswordAlreadySet;
export type RemovePasswordError = Token.NoSuchToken | Credential.NoFallbackAvailable;
export type RemoveCredentialError = Token.NoSuchToken | Credential.NoFallbackAvailable;
export type AddCredentialError = Token.NoSuchToken | Credential.InUse;

export interface Registration extends S.Schema.Type<typeof Registration> {}

export const Registration = S.struct({
  credentials: Credential.Secure,
  firstName: S.option(User.FirstName),
  lastName: S.option(User.LastName),
  optInMarketing: User.OptInMarketing,
});
