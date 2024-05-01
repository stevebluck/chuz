import { OAuth, Credential, Email, Password, Token } from "@chuz/domain";
import { User } from "@chuz/domain";
import { Context, Effect, Option } from "@chuz/prelude";
import { GenerateUrlFailure, NoSuchToken } from "../Errors";
import * as Errors from "./Errors";

export interface Users {
  // TODO: Take a crednetial and a partial user
  register: (registration: Registration) => Effect.Effect<User.Session, Errors.EmailAlreadyInUse>;

  identify: (token: User.Token) => Effect.Effect<User.Session, NoSuchToken>;

  authenticate: (credential: Credential.Plain) => Effect.Effect<User.Session, Errors.CredentialNotRecognised>;

  logout: (token: User.Token) => Effect.Effect<void>;

  generateAuthUrl: (state: OAuth.State) => Effect.Effect<OAuth.ProviderUrl, GenerateUrlFailure>;

  exchangeAuthCodeForSession: (
    code: OAuth.Code,
    state: OAuth.ValidatedState,
  ) => Effect.Effect<
    User.Session,
    Errors.EmailAlreadyInUse | Errors.CredentialNotRecognised | Errors.OAuthProviderError
  >;

  identities: (id: User.Id) => Effect.Effect<User.identity.Identities>;

  getById: (id: User.Id) => Effect.Effect<User.Identified, Errors.UserNotFound>;

  getByEmail: (email: Email) => Effect.Effect<User.Identified, Errors.UserNotFound>;

  update: (id: User.Id, partial: User.Partial) => Effect.Effect<User.Identified, Errors.UserNotFound>;

  updateEmail: (
    id: User.Id,
    email: Email,
  ) => Effect.Effect<User.Identified, Errors.UserNotFound | Errors.EmailAlreadyInUse>;

  updatePassword: (
    token: User.Token,
    currentPassword: Password.Plaintext,
    updatedPasword: Password.Hashed,
  ) => Effect.Effect<void, NoSuchToken | Errors.CredentialNotRecognised>;

  requestPasswordReset: (email: Email) => Effect.Effect<Token.Token<[Email, User.Id]>, Errors.CredentialNotRecognised>;

  resetPassword: (
    token: Token.Token<[Email, User.Id]>,
    password: Password.Hashed,
  ) => Effect.Effect<User.Identified, NoSuchToken>;

  linkCredential: (
    token: User.Token,
    credential: Credential.Secure,
  ) => Effect.Effect<User.identity.Identities, NoSuchToken | Errors.CredentialAlreadyExists>;

  unlinkCredential: (
    token: User.Token,
    provider: Credential.ProviderId,
  ) => Effect.Effect<
    User.identity.Identities,
    NoSuchToken | Errors.NoFallbackCredential | Errors.CredentialNotRecognised
  >;
}

export interface Registration {
  credential: Credential.Secure;
  firstName: Option.Option<User.FirstName>;
  lastName: Option.Option<User.LastName>;
  optInMarketing: User.OptInMarketing;
}

interface UsersId {
  readonly _: unique symbol;
}

export const Users = Context.GenericTag<UsersId, Users>("@core/Users");
