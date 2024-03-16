import { Credentials, Email, Id, Identified, Password, Session, Token, User } from "@chuz/domain";
import { Effect } from "effect";

export interface Users {
  register(registration: User.Registration): Effect.Effect<Session<User>, Email.AlreadyInUse>;

  findById(id: Id<User>): Effect.Effect<Identified<User>, User.NotFound>;

  findByEmail(email: Email): Effect.Effect<Identified<User>, User.NotFound>;

  identify(token: Token<Id<User>>): Effect.Effect<Session<User>, Token.NoSuchToken>;

  authenticate(credentials: Credentials.Plain): Effect.Effect<Session<User>, Credentials.NotRecognised>;

  authenticateByOAuth(code: Credentials.AuthCode): Effect.Effect<Session<User>, Credentials.InvalidAuthCode>;

  logout(token: Token<Id<User>>): Effect.Effect<void>;

  update(id: Id<User>, partial: User.Partial): Effect.Effect<Identified<User>, User.NotFound>;

  updateEmail(id: Id<User>, email: Email): Effect.Effect<Identified<User>, User.UpdateEmailError>;

  updatePassword(
    token: Token<Id<User>>,
    currentPassword: Password.Plaintext,
    updatedPasword: Password.Hashed,
  ): Effect.Effect<void, Credentials.NotRecognised | User.NotFound>;

  requestPasswordReset(email: Email): Effect.Effect<Token<[Email, Id<User>]>, Credentials.NotRecognised>;

  resetPassword(
    token: Token<[Email, Id<User>]>,
    password: Password.Hashed,
  ): Effect.Effect<Identified<User>, Token.NoSuchToken>;
}
