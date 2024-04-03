import { Credentials, Password, Token } from "@chuz/domain";
import { User } from "@chuz/domain";
import { Effect, ReadonlyArray } from "@chuz/prelude";
import { EmailAddress } from "@chuz/prelude/src/Schema";

export interface Users {
  register(registration: User.Registration): Effect.Effect<User.Session, User.EmailAlreadyInUse>;

  findById(id: User.Id): Effect.Effect<User.Identified, User.NotFound>;

  findByEmail(email: EmailAddress): Effect.Effect<User.Identified, User.NotFound>;

  identify(token: Token.Token<User.Id>): Effect.Effect<User.Session, Token.NoSuchToken>;

  authenticate(credential: Credentials.Plain): Effect.Effect<User.Session, Credentials.NotRecognised>;

  logout(token: Token.Token<User.Id>): Effect.Effect<void>;

  update(id: User.Id, partial: User.Partial): Effect.Effect<User.Identified, User.NotFound>;

  updateEmail(id: User.Id, email: EmailAddress): Effect.Effect<User.Identified, User.UpdateEmailError>;

  updatePassword(
    token: Token.Token<User.Id>,
    currentPassword: Password.Plaintext,
    updatedPasword: Password.Hashed,
  ): Effect.Effect<void, Credentials.NotRecognised | User.NotFound>;

  requestPasswordReset(
    email: EmailAddress,
  ): Effect.Effect<Token.Token<[EmailAddress, User.Id]>, Credentials.NotRecognised>;

  resetPassword(
    token: Token.Token<[EmailAddress, User.Id]>,
    password: Password.Hashed,
  ): Effect.Effect<User.Identified, Token.NoSuchToken>;

  findIdentitiesById(
    id: User.Id,
  ): Effect.Effect<ReadonlyArray.NonEmptyReadonlyArray<User.identity.Identity>, User.NotFound>;

  addIdentity(
    id: User.Id,
    credential: Credentials.Secure,
  ): Effect.Effect<ReadonlyArray.NonEmptyReadonlyArray<User.identity.Identity>, User.NotFound | User.CredentialInUse>;

  removeIdentity(
    id: User.Id,
    identity: User.identity.Identity,
  ): Effect.Effect<
    ReadonlyArray.NonEmptyReadonlyArray<User.identity.Identity>,
    User.NotFound | User.LastCredentialError
  >;
}
