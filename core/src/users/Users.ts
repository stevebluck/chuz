import { Credential, Email, Id, Identified, Password, Session, Token, User, PlainCredential } from "@chuz/domain";
import { Effect } from "effect";

export interface Users {
  register(registration: User.Registration): Effect.Effect<Session<User>, Email.AlreadyInUse>;

  findById(id: Id<User>): Effect.Effect<Identified<User>, User.NotFound>;

  findByEmail(email: Email): Effect.Effect<Identified<User>, User.NotFound>;

  identify(token: Token<Id<User>>): Effect.Effect<Session<User>, Token.NoSuchToken>;

  authenticate(credential: PlainCredential): Effect.Effect<Session<User>, Credential.NotRecognised>;

  logout(token: Token<Id<User>>): Effect.Effect<void>;

  update(id: Id<User>, partial: User.Partial): Effect.Effect<Identified<User>, User.NotFound>;

  updateEmail(id: Id<User>, email: Email): Effect.Effect<Identified<User>, User.UpdateEmailError>;

  updatePassword(
    token: Token<Id<User>>,
    currentPassword: Password.Plaintext,
    updatedPasword: Password.Hashed,
  ): Effect.Effect<void, Credential.NotRecognised | User.NotFound>;

  requestPasswordReset(email: Email): Effect.Effect<Token<[Email, Id<User>]>, Credential.NotRecognised>;

  resetPassword(
    token: Token<[Email, Id<User>]>,
    password: Password.Hashed,
  ): Effect.Effect<Identified<User>, Token.NoSuchToken>;
}
