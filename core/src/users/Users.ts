import { Credential, Email, Password, Token } from "@chuz/domain";
import { User } from "@chuz/domain";
import { Data, Effect, Option } from "@chuz/prelude";

// TODO: restrict one social auth to one provider
// TODO: auto link accounts with same email

export interface Users {
  register(registration: Registration): Effect.Effect<User.Session, EmailAlreadyInUse>;

  identify(token: User.Token): Effect.Effect<User.Session, Token.NoSuchToken>;

  authenticate(credential: Credential.Plain): Effect.Effect<User.Session, Credential.NotRecognised>;

  logout(token: User.Token): Effect.Effect<void>;

  identities(id: User.Id): Effect.Effect<User.identity.Identities>;

  getById(id: User.Id): Effect.Effect<User.Identified, UserNotFound>;

  getByEmail(email: Email): Effect.Effect<User.Identified, UserNotFound>;

  update(id: User.Id, partial: User.Partial): Effect.Effect<User.Identified, UserNotFound>;

  updateEmail(id: User.Id, email: Email): Effect.Effect<User.Identified, UpdateEmailError>;

  updatePassword(
    token: User.Token,
    currentPassword: Password.Plaintext,
    updatedPasword: Password.Hashed,
  ): Effect.Effect<void, UpdatePasswordError>;

  requestPasswordReset(email: Email): Effect.Effect<Token.Token<[Email, User.Id]>, Credential.NotRecognised>;

  resetPassword(
    token: Token.Token<[Email, User.Id]>,
    password: Password.Hashed,
  ): Effect.Effect<User.Identified, Token.NoSuchToken>;

  linkCredential(
    token: User.Token,
    credential: Credential.Secure,
  ): Effect.Effect<User.identity.Identities, LinkCredentialError>;

  unlinkCredential(
    token: User.Token,
    provider: Credential.ProviderId,
  ): Effect.Effect<User.identity.Identities, UnlinkCredentialError>;
}

export class UserNotFound extends Data.TaggedError("UserNotFound") {}

export class EmailAlreadyInUse extends Data.TaggedError("EmailAlreadyInUse")<{ email: Email }> {}

export type UpdateEmailError = UserNotFound | EmailAlreadyInUse;
export type UpdatePasswordError = Token.NoSuchToken | Credential.NotRecognised;
export type UnlinkCredentialError = Token.NoSuchToken | Credential.NoFallbackAvailable | Credential.NotRecognised;
export type LinkCredentialError = Token.NoSuchToken | Credential.AlreadyExists;

export interface Registration {
  credentials: Credential.Secure;
  firstName: Option.Option<User.FirstName>;
  lastName: Option.Option<User.LastName>;
  optInMarketing: User.OptInMarketing;
}
