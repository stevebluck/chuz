import { Credentials, Password, Token } from "@chuz/domain";
import * as User from "@chuz/domain/User";
import { Effect } from "effect";

export interface Users {
  register(registration: User.Registration): Effect.Effect<User.Session, User.EmailAlreadyInUse>;

  findById(id: User.Id): Effect.Effect<User.Identified, User.NotFound>;

  findByEmail(email: User.Email): Effect.Effect<User.Identified, User.NotFound>;

  identify(token: Token.Token<User.Id>): Effect.Effect<User.Session, Token.NoSuchToken>;

  authenticate(credential: Credentials.Plain): Effect.Effect<User.Session, Credentials.NotRecognised>;

  logout(token: Token.Token<User.Id>): Effect.Effect<void>;

  update(id: User.Id, partial: User.Partial): Effect.Effect<User.Identified, User.NotFound>;

  updateEmail(id: User.Id, email: User.Email): Effect.Effect<User.Identified, User.UpdateEmailError>;

  updatePassword(
    token: Token.Token<User.Id>,
    currentPassword: Password.Plaintext,
    updatedPasword: Password.Hashed,
  ): Effect.Effect<void, Credentials.NotRecognised | User.NotFound>;

  requestPasswordReset(email: User.Email): Effect.Effect<Token.Token<[User.Email, User.Id]>, Credentials.NotRecognised>;

  resetPassword(
    token: Token.Token<[User.Email, User.Id]>,
    password: Password.Hashed,
  ): Effect.Effect<User.Identified, Token.NoSuchToken>;
}
