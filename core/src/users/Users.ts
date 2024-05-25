import { Credential, Email, Id, Identified, Password, Session, Token } from "@chuz/domain";
import { User } from "@chuz/domain";
import { Effect, Option } from "@chuz/prelude";
import { NoSuchToken } from "../Errors";
import * as Errors from "./Errors";

export interface Users {
  register: (
    credential: Credential.Secure,
    firstName: Option.Option<User.FirstName>,
    lastName: Option.Option<User.LastName>,
    optInMarketing: User.OptInMarketing,
  ) => Effect.Effect<Session<User.User>, Errors.CredentialAlreadyInUse>;

  identify: (token: Token.Token<Id<User.User>>) => Effect.Effect<Session<User.User>, NoSuchToken>;

  authenticate: (credential: Credential.Plain) => Effect.Effect<Session<User.User>, Errors.CredentialNotRecognised>;

  logout: (token: Token.Token<Id<User.User>>) => Effect.Effect<void>;

  identities: (id: Id<User.User>) => Effect.Effect<User.Identities>;

  getById: (id: Id<User.User>) => Effect.Effect<Identified<User.User>, Errors.UserNotFound>;

  getByEmail: (email: Email) => Effect.Effect<Identified<User.User>, Errors.UserNotFound>;

  update: (id: Id<User.User>, partial: User.Partial) => Effect.Effect<Identified<User.User>, Errors.UserNotFound>;

  updateEmail: (
    id: Id<User.User>,
    email: Email,
  ) => Effect.Effect<Identified<User.User>, Errors.UserNotFound | Errors.EmailAlreadyInUse>;

  updatePassword: (
    token: Token.Token<Id<User.User>>,
    currentPassword: Password.Plaintext,
    updatedPasword: Password.Hashed,
  ) => Effect.Effect<void, NoSuchToken | Errors.CredentialNotRecognised>;

  requestPasswordReset: (
    email: Email,
  ) => Effect.Effect<Token.Token<[Email, Id<User.User>]>, Errors.CredentialNotRecognised>;

  resetPassword: (
    token: Token.Token<[Email, Id<User.User>]>,
    password: Password.Hashed,
  ) => Effect.Effect<Identified<User.User>, NoSuchToken>;

  linkCredential: (
    token: Token.Token<Id<User.User>>,
    credential: Credential.Secure,
  ) => Effect.Effect<User.Identities, NoSuchToken | Errors.CredentialAlreadyInUse>;

  unlinkCredential: (
    token: Token.Token<Id<User.User>>,
    type: Credential.Tag,
  ) => Effect.Effect<User.Identities, NoSuchToken | Errors.NoFallbackCredential | Errors.CredentialNotRecognised>;
}
