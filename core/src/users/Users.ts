import { Credentials, Email, Id, Identified, Password, Session, Token, User } from "@chuz/domain";
import { Data, Effect, Option } from "@chuz/prelude";

export interface Users {
  register: (registration: Users.Registration) => Effect.Effect<Session, Credentials.AlreadyInUse>;

  authenticate: (credential: Credentials.Authentication) => Effect.Effect<Session, Credentials.NotRecognised>;

  identify: (token: Token<Id<User>>) => Effect.Effect<Session, Token.NoSuchToken>;

  logout: (token: Token<Id<User>>) => Effect.Effect<void>;

  findById: (id: Id<User>) => Effect.Effect<Identified<User>, User.NotFound>;

  findByEmail: (email: Email) => Effect.Effect<Identified<User>, User.NotFound>;

  update: (id: Id<User>, user: User.Patch) => Effect.Effect<Identified<User>, User.NotFound>;

  updateEmail: (id: Id<User>, email: Email) => Effect.Effect<Identified<User>, Users.UpdateEmailError>;

  updatePassword: (token: Token<Id<User>>, currentPassword: Password.Plaintext, updatedPasword: Password.Hashed) => Effect.Effect<void, Users.UpdatePasswordError>;

  requestPasswordReset: (email: Email) => Effect.Effect<Password.Reset.Token, Credentials.NotRecognised>;

  resetPassword: (token: Password.Reset.Token, password: Password.Hashed) => Effect.Effect<Identified<User>, Token.NoSuchToken>;

  findCredentials: (id: Id<User>) => Effect.Effect<Array<Credentials.Public>>;

  linkCredential: (token: Token<Id<User>>, credential: Credentials.Registration) => Effect.Effect<void, Users.LinkCredentialError>;

  unlinkCredential: (token: Token<Id<User>>, type: Credentials.Registration.Name) => Effect.Effect<void, Users.UnlinkCredentialError>;
}

export namespace Users {
  export type Registration = {
    credentials: Credentials.Registration;
    firstName: Option.Option<User.FirstName>;
    lastName: Option.Option<User.LastName>;
    optInMarketing: User.OptInMarketing;
  };

  export namespace Registration {
    export const make = Data.case<Registration>();
  }

  export type UpdateEmailError = Credentials.AlreadyInUse | Credentials.NotRecognised;
  export type UpdatePasswordError = Token.NoSuchToken | Credentials.NotRecognised;
  export type LinkCredentialError = Token.NoSuchToken | Credentials.AlreadyInUse;
  export type UnlinkCredentialError = Token.NoSuchToken | Credentials.NoFallbackAvailable | Credentials.NotRecognised;
}
