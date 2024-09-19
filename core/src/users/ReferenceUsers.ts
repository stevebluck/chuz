import { Session, Credentials, Token, Id, User, Identified, Email, Password } from "@chuz/domain";
import { Array, Clock, Duration, Effect, Either, Equal, HashMap, Option, Ref } from "@chuz/prelude";
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
    if (Credentials.EmailPassword.is("Plain")(credentials)) {
      return this.findByEmail(credentials.email).pipe(
        Effect.tap((user) =>
          this.state.get.pipe(
            Effect.flatMap((s) => s.findEmailPasswordById(user.id)),
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
      Effect.tap((id) =>
        this.state.get.pipe(Effect.flatMap((s) => s.findEmailPasswordById(id))).pipe(
          Effect.flatMap((cred) => this.matchPassword(currentPassword, cred.password)),
          Effect.mapError(() => new Credentials.NotRecognised()),
        ),
      ),
      Effect.flatMap((id) =>
        this.state
          .modify((s) => s.updatePassword(id, updatedPasword))
          .pipe(
            Effect.flatten,
            Effect.mapError(() => new Credentials.NotRecognised()),
          ),
      ),
      Effect.tap((user) =>
        this.userTokens.findByValue(user.id).pipe(
          Effect.map((tokens) => tokens.filter((t) => !Token.equals(t, token))),
          Effect.flatMap(this.userTokens.revokeMany),
        ),
      ),
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
      Effect.flatMap(([email]) =>
        this.state
          .modify((s) => s.resetPassword(email, password))
          .pipe(
            Effect.flatten,
            Effect.tap((user) => this.userTokens.revokeAll(user.id)),
          ),
      ),
      Effect.mapError(() => new Token.NoSuchToken()),
    );
  };

  findCredentials = (id: Id<User>): Effect.Effect<Array<Credentials.Public>> => {
    return this.state.get.pipe(
      Effect.map((s) => s.findCredentialsById(id)),
      Effect.map(
        Array.map(
          Credentials.Registration.match({
            Google: ({ email }) => Credentials.OAuth.Google({ email }),
            Secure: ({ email }) => Credentials.EmailPassword.Public({ email }),
          }),
        ),
      ),
    );
  };

  linkCredential = (token: Token<Id<User>>, credential: Credentials.Registration): Effect.Effect<void, Users.LinkCredentialError> => {
    return this.userTokens.lookup(token).pipe(
      Effect.flatMap((id) => this.state.get.pipe(Effect.flatMap((s) => s.findById(id)))),
      Effect.mapError(() => new Token.NoSuchToken()),
      Effect.flatMap((user) => this.state.modify((s) => s.linkCredential(user.id, credential))),
      Effect.flatten,
    );
  };

  unlinkCredential = (token: Token<Id<User>>, type: Credentials.Registration.Name): Effect.Effect<void, Users.UnlinkCredentialError> => {
    return this.userTokens.lookup(token).pipe(
      Effect.flatMap((userId) => this.state.modify((s) => s.unlinkCredential(userId, type))),
      Effect.flatten,
    );
  };

  private makeSession = (user: Identified<User>): Effect.Effect<Session> => {
    return this.userTokens.issue(user.id, Ttl).pipe(Effect.map(Session.make(user)));
  };
}

class State {
  constructor(
    private readonly byId: HashMap.HashMap<Id<User>, Identified<User>>,
    private readonly credentialsByUser: HashMap.HashMap<Id<User>, Array<Credentials.Registration>>,
    private readonly ids: AutoIncrement<User>,
  ) {}

  set = ({ credentials, ...registration }: Users.Registration): [Either.Either<Identified<User>, Credentials.AlreadyInUse>, State] => {
    return Option.match(this.findByEmail(credentials.email), {
      onNone: () => {
        const [id, newIds] = this.ids.next();
        const user = Identified.make(User.make({ ...registration, email: credentials.email }), id);
        const byId = HashMap.set(this.byId, id, user);
        const credentialsByUser = HashMap.set(this.credentialsByUser, id, [credentials]);
        return [Either.right(user), new State(byId, credentialsByUser, newIds)];
      },
      onSome: () => [Either.left(new Credentials.AlreadyInUse()), this],
    });
  };

  update = (id: Id<User>, patch: User.Patch): [Either.Either<Identified<User>, User.NotFound>, State] => {
    return Option.match(this.findById(id), {
      onNone: () => [Either.left(new User.NotFound()), this],
      onSome: (user) => {
        const updatedUser = Identified.make(User.make({ ...user.value, ...patch }), id);
        const byId = HashMap.set(this.byId, id, updatedUser);
        return [Either.right(updatedUser), new State(byId, this.credentialsByUser, this.ids)];
      },
    });
  };

  updateEmail = (user: Identified<User>, email: Email): [Either.Either<Identified<User>, Credentials.AlreadyInUse | Credentials.NotRecognised>, State] => {
    return Option.match(this.findEmailPasswordById(user.id), {
      onNone: () => [Either.left(new Credentials.NotRecognised()), this],
      onSome: () =>
        this.findByEmail(email).pipe(
          Option.match({
            onNone: () => this.updateUserEmail(user, email),
            onSome: (existingUser) => {
              if (Equal.equals(existingUser.id, user.id)) {
                return this.updateUserEmail(user, email);
              }
              return [Either.left(new Credentials.AlreadyInUse()), this];
            },
          }),
        ),
    });
  };

  updatePassword = (id: Id<User>, password: Password.Hashed): [Either.Either<Identified<User>, Credentials.NotRecognised | User.NotFound>, State] => {
    return Option.match(this.findById(id), {
      onNone: () => [Either.left(new User.NotFound()), this],
      onSome: (user) =>
        this.findEmailPasswordById(id).pipe(
          Option.match({
            onNone: () => [Either.left(new Credentials.NotRecognised()), this],
            onSome: () => {
              const credentialsByUser = HashMap.modify(
                this.credentialsByUser,
                id,
                Array.map((cred) => (Credentials.EmailPassword.is("Secure")(cred) ? Credentials.EmailPassword.Secure({ email: cred.email, password }) : cred)),
              );
              return [Either.right(user), new State(this.byId, credentialsByUser, this.ids)];
            },
          }),
        ),
    });
  };

  findByEmail = (email: Email): Option.Option<Identified<User>> => {
    return HashMap.findFirst(this.credentialsByUser, (credentials) => credentials.some((cred) => cred.email.toLowerCase() === email.toLowerCase())).pipe(
      Option.flatMap(([userId]) => HashMap.get(this.byId, userId)),
    );
  };

  findById = (id: Id<User>): Option.Option<Identified<User>> => {
    return HashMap.get(this.byId, id);
  };

  resetPassword = (email: Email, password: Password.Hashed): [Either.Either<Identified<User>, Credentials.NotRecognised>, State] => {
    return Option.match(this.findByEmail(email), {
      onNone: () => [Either.left(new Credentials.NotRecognised()), this],
      onSome: (user) => {
        const credentialsByUser = HashMap.modify(
          this.credentialsByUser,
          user.id,
          Array.map((cred) => (Credentials.EmailPassword.is("Secure")(cred) ? Credentials.EmailPassword.Secure({ email, password }) : cred)),
        );
        return [Either.right(user), new State(this.byId, credentialsByUser, this.ids)];
      },
    });
  };

  findEmailPasswordById = (id: Id<User>): Option.Option<Credentials.EmailPassword.Secure> => {
    return HashMap.get(this.credentialsByUser, id).pipe(Option.flatMap(Array.findFirst(Credentials.EmailPassword.is("Secure"))));
  };

  findCredentialsById = (id: Id<User>): Array<Credentials.Registration> => {
    return HashMap.get(this.credentialsByUser, id).pipe(Option.getOrElse(() => [] as Array<Credentials.Registration>));
  };

  linkCredential = (id: Id<User>, credential: Credentials.Registration): [Either.Either<void, Users.LinkCredentialError>, State] => {
    const existingCredential = HashMap.findFirst(
      this.credentialsByUser,
      Array.some((cred) => Equal.equals(cred.email, credential.email)),
    );

    if (Option.isNone(existingCredential)) {
      const userAlreadyHasCredentialSet = this.findCredentialsById(id).some(Credentials.Registration.is(credential._tag));

      if (userAlreadyHasCredentialSet) {
        return [Either.left(new Credentials.AlreadyInUse()), this];
      }

      const credentialsByUser = HashMap.modify(this.credentialsByUser, id, (creds) => creds.concat(credential));
      const state = new State(this.byId, credentialsByUser, this.ids);

      return [Either.right(undefined), state];
    }

    const [existingUserId] = existingCredential.value;

    if (Equal.equals(id, existingUserId)) {
      return [Either.right(undefined), this];
    }

    return [Either.left(new Credentials.AlreadyInUse()), this];
  };

  unlinkCredential = (id: Id<User>, type: Credentials.Registration.Name): [Either.Either<void, Credentials.NotRecognised | Credentials.NoFallbackAvailable>, State] => {
    const userCredentials = this.findCredentialsById(id);

    if (userCredentials.length === 1) {
      return [Either.left(new Credentials.NoFallbackAvailable()), this];
    }

    const credentialToUnlink = userCredentials.find(Credentials.Registration.is(type));

    if (!credentialToUnlink) {
      return [Either.left(new Credentials.NotRecognised()), this];
    }

    const remainingCredentials = userCredentials.filter((cred) => cred._tag !== type);
    const credentialsByUser = HashMap.set(this.credentialsByUser, id, remainingCredentials);

    const user = HashMap.get(this.byId, id).pipe(Option.getOrThrow);

    // Update the users email if they are removing a credential asscoiated with it
    if (Equal.equals(user.value.email, credentialToUnlink.email)) {
      const newEmail = remainingCredentials[0].email;
      const [updatedUserResult, state] = this.updateUserEmail(user, newEmail);

      return Either.match(updatedUserResult, {
        onLeft: (error) => [Either.left(error), this],
        onRight: () => [Either.right(undefined), new State(state.byId, credentialsByUser, this.ids)],
      });
    }

    return [Either.right(undefined), new State(this.byId, credentialsByUser, this.ids)];
  };

  private updateUserEmail = (user: Identified<User>, email: Email): [Either.Either<Identified<User>, never>, State] => {
    const updatedUser = Identified.make(User.make({ ...user.value, email }), user.id);
    const byId = HashMap.set(this.byId, user.id, updatedUser);
    const credentialsByUser = HashMap.modify(this.credentialsByUser, user.id, (creds) =>
      creds.map((cred) => (Credentials.EmailPassword.is("Secure")(cred) ? Credentials.EmailPassword.Secure({ email, password: cred.password }) : cred)),
    );
    return [Either.right(updatedUser), new State(byId, credentialsByUser, this.ids)];
  };
}
