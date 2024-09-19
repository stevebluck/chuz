import { Session, Credentials, Token, Id, User, Identified, Email, Password } from "@chuz/domain";
import { Array, Clock, Duration, Effect, Either, HashMap, Option, Ref } from "@chuz/prelude";
import { Passwords } from "../auth/Passwords";
import { AutoIncrement } from "../persistence/AutoIncrement";
import { ReferenceTokens } from "../tokens/ReferenceTokens";
import { Tokens } from "../tokens/Tokens";
import { Users } from "./Users";

const Ttl = Token.TimeToLive({ duration: Duration.days(2) });

export class ReferenceUsers implements Users {
  static make = (clock: Clock.Clock, matchPassword: Passwords.Match) =>
    Effect.gen(function* () {
      const state = yield* Ref.make(new State(HashMap.empty(), HashMap.empty(), AutoIncrement.empty()));
      const userTokens = yield* ReferenceTokens.make(clock, User.eqId);
      const passwordResetTokens = yield* ReferenceTokens.make(clock, Password.Reset.eq);
      return new ReferenceUsers(state, userTokens, passwordResetTokens, matchPassword);
    });

  constructor(
    private readonly state: Ref.Ref<State>,
    private readonly userTokens: Tokens<Id<User>>,
    private readonly passwordResetTokens: Tokens<Password.Reset>,
    private readonly matchPassword: Passwords.Match,
  ) {}

  register = (registration: Users.Registration): Effect.Effect<Session, Credentials.AlreadyInUse> => {
    return this.state.modify((s) => s.set(registration)).pipe(Effect.flatten, Effect.flatMap(this.makeSession));
  };

  authenticate = (credentials: Credentials.Authentication): Effect.Effect<Session, Credentials.NotRecognised> => {
    if (Credentials.EmailPassword.is("EmailPasswordPlain")(credentials)) {
      return this.findByEmail(credentials.email).pipe(
        Effect.tap((user) =>
          this.state.get.pipe(
            Effect.map((s) => s.findEmailPasswordById(user.id)),
            Effect.flatten,
            Effect.flatMap(({ password }) => this.matchPassword(credentials.password, password)),
          ),
        ),
        Effect.flatMap(this.makeSession),
        Effect.mapError(() => new Credentials.NotRecognised()),
      );
    }

    return this.findByEmail(credentials.email).pipe(
      Effect.flatMap(this.makeSession),
      Effect.mapError(() => new Credentials.NotRecognised()),
    );
  };

  identify = (token: Token<Id<User>>): Effect.Effect<Session, Token.NoSuchToken> => {
    return this.userTokens.lookup(token).pipe(
      Effect.flatMap((id) => this.state.get.pipe(Effect.flatMap((s) => s.findById(id)))),
      Effect.mapError(() => new Token.NoSuchToken()),
      Effect.map((user) => Session.make(user)(token)),
    );
  };

  logout = (token: Token<Id<User>>): Effect.Effect<void> => {
    return this.userTokens.revoke(token);
  };

  findById = (id: Id<User>): Effect.Effect<Identified<User>, User.NotFound> => {
    return this.state.get.pipe(
      Effect.flatMap((s) => s.findById(id)),
      Effect.mapError(() => new User.NotFound()),
    );
  };

  findByEmail = (email: Email): Effect.Effect<Identified<User>, User.NotFound> => {
    return this.state.get.pipe(
      Effect.flatMap((s) => s.findByEmail(email)),
      Effect.mapError(() => new User.NotFound()),
    );
  };

  update = (id: Id<User>, user: User.Patch): Effect.Effect<Identified<User>, User.NotFound> => {
    return this.state.modify((s) => s.update(id, user)).pipe(Effect.flatten);
  };

  updateEmail = (id: Id<User>, email: Email): Effect.Effect<Identified<User>, Users.UpdateEmailError> => {
    return this.findById(id).pipe(
      Effect.mapError(() => new Credentials.NotRecognised()),
      Effect.flatMap((user) => this.state.modify((s) => s.updateEmail(user, email))),
      Effect.flatten,
    );
  };

  updatePassword = (token: Token<Id<User>>, currentPassword: Password.Plaintext, updatedPasword: Password.Hashed): Effect.Effect<void, Users.UpdatePasswordError> => {
    return this.userTokens.lookup(token).pipe(
      Effect.mapError(() => new Token.NoSuchToken()),
      Effect.tap((id) =>
        this.state.get.pipe(Effect.flatMap((s) => s.findEmailPasswordById(id))).pipe(
          Effect.flatMap((cred) => this.matchPassword(currentPassword, cred.password)),
          Effect.mapError(() => new Credentials.NotRecognised()),
        ),
      ),
      Effect.flatMap((id) => this.state.modify((s) => s.updatePassword(id, updatedPasword))),
      Effect.flatten,
      Effect.tap((user) => this.userTokens.findByValue(user.id).pipe(Effect.map(Array.filter((t) => !Token.equals(t, token))), Effect.flatMap(this.userTokens.revokeMany))),
    );
  };

  requestPasswordReset = (email: Email): Effect.Effect<Password.Reset.Token, Credentials.NotRecognised> => {
    return this.findByEmail(email).pipe(
      Effect.flatMap((user) => this.passwordResetTokens.issue([user.value.email, user.id], Ttl)),
      Effect.mapError(() => new Credentials.NotRecognised()),
    );
  };

  resetPassword = (token: Password.Reset.Token, password: Password.Hashed): Effect.Effect<Identified<User>, Token.NoSuchToken> => {
    return this.passwordResetTokens.lookup(token).pipe(
      Effect.tap(() => this.passwordResetTokens.revoke(token)),
      Effect.flatMap(([, id]) => this.state.modify((s) => s.updatePassword(id, password))),
      Effect.flatten,
      Effect.mapError(() => new Token.NoSuchToken()),
    );
  };

  findCredentials = (id: Id<User>): Effect.Effect<Array<Credentials.EmailPassword.Display>> => {
    return Effect.die("Not implemented");
  };

  linkCredential = (token: Token<Id<User>>, credential: Credentials.Authentication): Effect.Effect<void, Users.LinkCredentialError> => {
    return Effect.die("Not implemented");
  };

  unlinkCredential = (token: Token<Id<User>>, type: Credentials.Name): Effect.Effect<void, Users.UnlinkCredentialError> => {
    return Effect.die("Not implemented");
  };

  private makeSession = (user: Identified<User>): Effect.Effect<Session> => {
    return this.userTokens.issue(user.id, Ttl).pipe(Effect.map(Session.make(user)));
  };
}

class State {
  constructor(
    private readonly byId: HashMap.HashMap<Id<User>, Identified<User>>,
    private readonly byCredentials: HashMap.HashMap<Credentials.Registration, Id<User>>,
    private readonly ids: AutoIncrement<User>,
  ) {}

  set = (registration: Users.Registration): [Either.Either<Identified<User>, Credentials.AlreadyInUse>, State] => {
    if (Option.isSome(this.findByEmail(registration.credentials.email))) {
      return [Either.left(new Credentials.AlreadyInUse()), this];
    }

    const [id, ids] = this.ids.next();

    const user = Identified.make(
      User.make({
        email: registration.credentials.email,
        firstName: registration.firstName,
        lastName: registration.lastName,
        optInMarketing: registration.optInMarketing,
      }),
      id,
    );

    const users = HashMap.set(this.byId, id, user);
    const credentials = HashMap.set(this.byCredentials, registration.credentials, id);

    return [Either.right(user), new State(users, credentials, ids)];
  };

  update = (id: Id<User>, patch: User.Patch): [Either.Either<Identified<User>, User.NotFound>, State] => {
    const byId = HashMap.modify(this.byId, id, (user) =>
      Identified.make(
        User.make({
          email: user.value.email,
          firstName: patch.firstName || user.value.firstName,
          lastName: patch.lastName || user.value.lastName,
          optInMarketing: patch.optInMarketing || user.value.optInMarketing,
        }),
        id,
      ),
    );

    const user = HashMap.get(byId, id);

    return Option.match(user, {
      onNone: () => [Either.left(new User.NotFound()), this],
      onSome: (user) => [Either.right(user), new State(byId, this.byCredentials, this.ids)],
    });
  };

  updateEmail = (user: Identified<User>, email: Email): [Either.Either<Identified<User>, Credentials.AlreadyInUse | Credentials.NotRecognised>, State] => {
    if (Option.isSome(this.findByEmail(email))) {
      return [Either.left(new Credentials.AlreadyInUse()), this];
    }

    const credentials = this.findEmailPasswordById(user.id);

    if (Option.isNone(credentials)) {
      return [Either.left(new Credentials.NotRecognised()), this];
    }

    const byId = HashMap.modify(this.byId, user.id, (u) => Identified.make(User.make({ ...u.value, email }), u.id));
    const removed = HashMap.remove(this.byCredentials, credentials.value);
    const byCredentials = HashMap.set(removed, Credentials.EmailPassword.Secure({ email, password: credentials.value.password }), user.id);

    return [Either.right(user), new State(byId, byCredentials, this.ids)];
  };

  updatePassword = (id: Id<User>, password: Password.Hashed): [Either.Either<Identified<User>, Credentials.NotRecognised>, State] => {
    const user = HashMap.get(this.byId, id);

    if (Option.isNone(user)) {
      return [Either.left(new Credentials.NotRecognised()), this];
    }

    const credentials = this.findEmailPasswordById(id);

    if (Option.isNone(credentials)) {
      return [Either.left(new Credentials.NotRecognised()), this];
    }

    const byCredentials = HashMap.set(this.byCredentials, { ...credentials.value, password }, id);

    return [Either.right(user.value), new State(this.byId, byCredentials, this.ids)];
  };

  findByEmail = (email: Email): Option.Option<Identified<User>> => {
    return HashMap.findFirst(this.byId, (u) => u.value.email.toLowerCase() === email.toLowerCase()).pipe(Option.map(([_, user]) => user));
  };

  findById = (id: Id<User>): Option.Option<Identified<User>> => {
    return HashMap.findFirst(this.byId, (u) => u.id === id).pipe(Option.map(([_, user]) => user));
  };

  findCredentialsById = (id: Id<User>): Array<Credentials.Registration> => {
    return HashMap.filter(this.byCredentials, (userId) => userId.value === id.value).pipe(
      Array.fromIterable,
      Array.map(([credentials]) => credentials),
    );
  };

  findEmailPasswordById = (id: Id<User>): Option.Option<Credentials.EmailPassword.Secure> => {
    return Array.findFirst(this.findCredentialsById(id), Credentials.Registration.is("EmailPasswordSecure"));
  };
}
