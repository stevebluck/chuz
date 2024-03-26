import {
  User,
  Session,
  Email,
  Id,
  Identified,
  Token,
  Credential,
  Password,
  AuthenticateCredential,
} from "@chuz/domain";
import { Effect } from "effect";
import { DB, Database } from "../persistence/Database";
import { Users } from "./Users";

export class RdmsUsers implements Users {
  constructor(private readonly db: Database) {}

  static make = (db: Database): Effect.Effect<Users> => Effect.sync(() => new RdmsUsers(db));

  identify = (token: Token<Id<User>>): Effect.Effect<Session<User>, Token.NoSuchToken> => {
    throw new Error("Method not implemented.");
  };

  register = (registration: User.Registration): Effect.Effect<Session<User>, Email.AlreadyInUse> => {
    throw new Error("Method not implemented.");
  };

  authenticate = (credential: AuthenticateCredential): Effect.Effect<Session<User>, Credential.NotRecognised> => {
    throw new Error("Method not implemented.");
  };

  logout = (token: Token<Id<User>>): Effect.Effect<void> => {
    throw new Error("Method not implemented.");
  };

  findById = (id: Id<User>): Effect.Effect<Identified<User>, User.NotFound> => {
    const query = this.db.query.selectFrom("users").where("id", "=", id.value).selectAll();

    return this.db.findOneOrElse("findById", query, new User.NotFound()).pipe(Effect.flatMap(DbUser.toUser));
  };

  findByEmail = (email: Email): Effect.Effect<Identified<User>, User.NotFound> => {
    const query = this.db.query.selectFrom("users").where("id", "=", email).selectAll();

    return this.db.findOneOrElse("findByEmail", query, new User.NotFound()).pipe(Effect.flatMap(DbUser.toUser));
  };

  update(id: Id<User>, partial: User.Partial): Effect.Effect<Identified<User>, User.NotFound> {
    throw new Error("Method not implemented.");
  }

  updateEmail(id: Id<User>, email: Email): Effect.Effect<Identified<User>, User.UpdateEmailError> {
    throw new Error("Method not implemented.");
  }

  updatePassword(
    token: Token<Id<User>>,
    currentPassword: Password.Plaintext,
    updatedPasword: Password.Hashed,
  ): Effect.Effect<void, User.NotFound | Credential.NotRecognised> {
    throw new Error("Method not implemented.");
  }

  requestPasswordReset(email: Email): Effect.Effect<Token<[Email, Id<User>]>, Credential.NotRecognised> {
    throw new Error("Method not implemented.");
  }

  resetPassword(
    token: Token<[Email, Id<User>]>,
    password: Password.Hashed,
  ): Effect.Effect<Identified<User>, Token.NoSuchToken> {
    throw new Error("Method not implemented.");
  }
}

namespace DbUser {
  export const toUser = (user: DB["users"]): Effect.Effect<Identified<User>> =>
    User.from({
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      optInMarketing: user.opt_in_marketing || false,
    }).pipe(
      Effect.map((u) => new Identified<User>({ id: Id(user.id), value: u })),
      Effect.orDie,
    );
}
