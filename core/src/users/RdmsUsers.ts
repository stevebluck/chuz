import { User, Email, Id, Identified, Token, Credentials, Password } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { DB, Database } from "../persistence/Database";
import { Users } from "./Users";

export class RdmsUsers implements Users {
  constructor(private readonly db: Database) {}

  static make = (db: Database): Effect.Effect<Users> => Effect.sync(() => new RdmsUsers(db));

  identify = (token: User.Token): Effect.Effect<User.Session, Token.NoSuchToken> => {
    throw new Error("Method not implemented.");
  };

  register = (registration: User.Registration): Effect.Effect<User.Session, Email.AlreadyInUse> => {
    throw new Error("Method not implemented.");
  };

  authenticate = (credential: Credentials.Plain): Effect.Effect<User.Session, Credentials.NotRecognised> => {
    throw new Error("Method not implemented.");
  };

  logout = (token: User.Token): Effect.Effect<void> => {
    throw new Error("Method not implemented.");
  };

  findById = (id: User.Id): Effect.Effect<User.Identified, User.NotFound> => {
    const query = this.db.query.selectFrom("users").where("id", "=", id.value).selectAll();

    return this.db.findOneOrElse("findById", query, new User.NotFound()).pipe(Effect.flatMap(DbUser.toUser));
  };

  findByEmail = (email: Email.Email): Effect.Effect<User.Identified, User.NotFound> => {
    const query = this.db.query.selectFrom("users").where("id", "=", email).selectAll();

    return this.db.findOneOrElse("findByEmail", query, new User.NotFound()).pipe(Effect.flatMap(DbUser.toUser));
  };

  update(id: User.Id, partial: User.Partial): Effect.Effect<User.Identified, User.NotFound> {
    throw new Error("Method not implemented.");
  }

  updateEmail(id: User.Id, email: Email.Email): Effect.Effect<User.Identified, User.UpdateEmailError> {
    throw new Error("Method not implemented.");
  }

  updatePassword(
    token: User.Token,
    currentPassword: Password.Plaintext,
    updatedPasword: Password.Hashed,
  ): Effect.Effect<void, User.NotFound | Credentials.NotRecognised> {
    throw new Error("Method not implemented.");
  }

  requestPasswordReset(
    email: Email.Email,
  ): Effect.Effect<Token.Token<[Email.Email, User.Id]>, Credentials.NotRecognised> {
    throw new Error("Method not implemented.");
  }

  resetPassword(
    token: Token.Token<[Email.Email, User.Id]>,
    password: Password.Hashed,
  ): Effect.Effect<User.Identified, Token.NoSuchToken> {
    throw new Error("Method not implemented.");
  }
}

namespace DbUser {
  export const toUser = (user: DB["users"]): Effect.Effect<User.Identified> =>
    User.from({
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      optInMarketing: user.opt_in_marketing || false,
    }).pipe(
      Effect.map((u) => new Identified<User.User>({ id: Id(user.id), value: u })),
      Effect.orDie,
    );
}
