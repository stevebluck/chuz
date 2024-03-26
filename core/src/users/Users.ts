import { Credentials, Email, Password, Token, User } from "@chuz/domain";
import { Identified, Id, Session } from "@chuz/domain/src/User";
import { Effect } from "@chuz/prelude";

export interface Users {
  register(registration: User.Registration): Effect.Effect<Session, Email.AlreadyInUse>;

  findById(id: Id): Effect.Effect<Identified, User.NotFound>;

  findByEmail(email: Email.Email): Effect.Effect<Identified, User.NotFound>;

  identify(token: Token.Token<Id>): Effect.Effect<Session, Token.NoSuchToken>;

  authenticate(credential: Credentials.Plain): Effect.Effect<Session, Credentials.NotRecognised>;

  logout(token: Token.Token<Id>): Effect.Effect<void>;

  update(id: Id, partial: User.Partial): Effect.Effect<Identified, User.NotFound>;

  updateEmail(id: Id, email: Email.Email): Effect.Effect<Identified, User.UpdateEmailError>;

  updatePassword(
    token: Token.Token<Id>,
    currentPassword: Password.Plaintext,
    updatedPasword: Password.Hashed,
  ): Effect.Effect<void, Credentials.NotRecognised | User.NotFound>;

  requestPasswordReset(email: Email.Email): Effect.Effect<Token.Token<[Email.Email, Id]>, Credentials.NotRecognised>;

  resetPassword(
    token: Token.Token<[Email.Email, Id]>,
    password: Password.Hashed,
  ): Effect.Effect<Identified, Token.NoSuchToken>;
}
