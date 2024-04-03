import { Credentials, EmailPassword, Id, Identified, Password, Session, Token, User } from "@chuz/domain";
import { Duration, Effect, Either, HashMap, Option, ReadonlyArray, Ref, S, identity } from "@chuz/prelude";
import { Passwords } from "core/auth/Passwords";
import { AutoIncrement } from "core/persistence/AutoIncrement";
import { Tokens } from "core/tokens/Tokens";
import { Users } from "core/users/Users";

const ONE_DAY = Duration.toMillis("1 days");
const TWO_DAYS = Duration.toMillis("2 days");

export class ReferenceUsers implements Users {
  static make = (
    userTokens: Tokens<User.Id>,
    passwordResetTokens: Tokens<Password.Reset<User.User>>,
    match: Passwords.Match,
  ): Effect.Effect<Users> =>
    Effect.gen(function* (_) {
      const state = yield* _(Ref.make(new State(HashMap.empty(), HashMap.empty(), AutoIncrement.empty())));
      return new ReferenceUsers(state, userTokens, passwordResetTokens, match);
    });

  constructor(
    private readonly state: Ref.Ref<State>,
    private readonly userTokens: Tokens<User.Id>,
    private readonly passwordResetTokens: Tokens<Password.Reset<User.User>>,
    private readonly match: Passwords.Match,
  ) {}

  register = (registration: User.Registration): Effect.Effect<User.Session, User.EmailAlreadyInUse> => {
    return Ref.modify(this.state, (s) => s.register(registration)).pipe(
      Effect.flatMap(identity),
      Effect.flatMap((user) =>
        this.userTokens
          .issue(user.id, new Token.TimeToLive({ duration: TWO_DAYS }))
          .pipe(Effect.map((token) => new Session({ user, token }))),
      ),
    );
  };

  identify = (token: User.Token): Effect.Effect<User.Session, Token.NoSuchToken> => {
    return this.userTokens.lookup(token).pipe(
      Effect.flatMap(this.findById),
      Effect.mapError(() => new Token.NoSuchToken()),
      Effect.map((user) => new Session({ user, token })),
    );
  };

  logout = (token: User.Token): Effect.Effect<void> => this.userTokens.revoke(token);

  findById = (id: Id<User.User>): Effect.Effect<Identified<User.User>, User.NotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((s) => s.findById(id)),
      Effect.mapError(() => new User.NotFound()),
    );
  };

  authenticate = (credential: Credentials.PlainCredential): Effect.Effect<User.Session, Credentials.NotRecognised> => {
    const findUserByCredential = Credentials.matchPlain({
      Plain: ({ email, password }) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((state) => state.findEmailCredential(email)),
          Effect.flatMap((secure) =>
            Effect.if(this.match(password, secure.password), {
              onTrue: this.findByEmail(email),
              onFalse: new Credentials.NotRecognised(),
            }),
          ),
          Effect.mapError(() => new Credentials.NotRecognised()),
        ),
      SocialCredential: (credential) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((state) => state.findByCredential(credential)),
          Effect.mapError(() => new Credentials.NotRecognised()),
        ),
    });

    return findUserByCredential(credential).pipe(
      Effect.flatMap((user) =>
        this.userTokens
          .issue(user.id, new Token.TimeToLive({ duration: TWO_DAYS }))
          .pipe(Effect.map((token) => new Session({ user, token }))),
      ),
    );
  };

  findByEmail = (email: S.EmailAddress): Effect.Effect<Identified<User.User>, User.NotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((s) => s.findByEmail(email)),
      Effect.mapError(() => new User.NotFound()),
    );
  };

  update = (id: User.Id, draft: User.Partial): Effect.Effect<User.Identified, User.NotFound> => {
    return Ref.modify(this.state, (s) => s.update(id, draft)).pipe(Effect.flatMap(identity));
  };

  updateEmail = (id: User.Id, email: S.EmailAddress): Effect.Effect<User.Identified, User.UpdateEmailError> => {
    return Ref.modify(this.state, (s) => s.updateEmail(id, email)).pipe(Effect.flatMap(identity));
  };

  updatePassword = (
    token: User.Token,
    currentPassword: Password.Plaintext,
    updatedPassword: Password.Hashed,
  ): Effect.Effect<void, Credentials.NotRecognised | User.NotFound> => {
    return this.userTokens.lookup(token).pipe(
      Effect.mapError(() => new User.NotFound()),
      Effect.flatMap(this.findById),
      Effect.flatMap((user) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((s) => s.findEmailCredential(user.value.email)),
          Effect.mapError(() => new Credentials.NotRecognised()),
          Effect.flatMap((secure) =>
            // Check the current password is valid and update it
            Effect.if(this.match(currentPassword, secure.password), {
              onTrue: Ref.update(this.state, (s) =>
                s.updatePassword(user.id, user.value.email, secure.password, updatedPassword),
              ),
              onFalse: Effect.fail(new Credentials.NotRecognised()),
            }),
          ),
          // Revoke all session tokens except the current one
          Effect.zipRight(
            this.userTokens.findByValue(user.id).pipe(
              Effect.map((tokens) => tokens.filter((t) => !Token.equals(t, token))),
              Effect.flatMap(this.userTokens.revokeMany),
            ),
          ),
        ),
      ),
    );
  };

  requestPasswordReset = (
    email: S.EmailAddress,
  ): Effect.Effect<Token.Token<[S.EmailAddress, User.Id]>, Credentials.NotRecognised> =>
    this.findByEmail(email).pipe(
      Effect.mapError(() => new Credentials.NotRecognised()),
      Effect.flatMap((user) =>
        this.passwordResetTokens.issue([email, user.id], new Token.TimeToLive({ duration: ONE_DAY })),
      ),
    );

  resetPassword = (
    token: Token.Token<[S.EmailAddress, User.Id]>,
    password: Password.Hashed,
  ): Effect.Effect<User.Identified, Token.NoSuchToken> =>
    this.passwordResetTokens.lookup(token).pipe(
      Effect.tap(() => this.passwordResetTokens.revoke(token)),
      Effect.flatMap(([email]) =>
        this.state
          .modify((s) => s.resetPassword(email, password))
          .pipe(
            Effect.flatMap(identity),
            Effect.tap((user) => this.userTokens.revokeAll(user.id)),
            Effect.orDie,
          ),
      ),
    );

  findIdentitiesById = (
    id: User.Id,
  ): Effect.Effect<ReadonlyArray.NonEmptyReadonlyArray<User.identity.Identity>, User.NotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((s) => s.findCredentialsById(id)),
      Effect.mapError(() => new User.NotFound()),
      Effect.filterOrDie(ReadonlyArray.isNonEmptyArray, () => "User has no credentials"),
      Effect.map(ReadonlyArray.map(User.identity.fromCredential)),
    );
  };

  addIdentity = (
    id: User.Id,
    credential: Credentials.SecureCredential,
  ): Effect.Effect<
    ReadonlyArray.NonEmptyReadonlyArray<User.identity.Identity>,
    User.NotFound | User.CredentialInUse
  > => {
    return Ref.modify(this.state, (state) => state.addCredential(id, credential)).pipe(
      Effect.flatMap(identity),
      Effect.flatMap(() => this.findIdentitiesById(id)),
    );
  };

  removeIdentity = (
    id: User.Id,
    userIdentity: User.identity.Identity,
  ): Effect.Effect<
    ReadonlyArray.NonEmptyReadonlyArray<User.identity.Identity>,
    User.NotFound | User.LastCredentialError
  > => {
    return this.findById(id).pipe(
      Effect.flatMap(() => Ref.modify(this.state, (state) => state.removeCredential(id, userIdentity))),
      Effect.flatMap(identity),
      Effect.flatMap(() => this.findIdentitiesById(id)),
    );
  };
}

class State {
  constructor(
    private readonly byCredential: HashMap.HashMap<Credentials.SecureCredential, User.Id>,
    private readonly byId: HashMap.HashMap<User.Id, User.Identified>,
    private readonly ids: AutoIncrement<User.User>,
  ) {}

  findById = (id: User.Id): Option.Option<User.Identified> => {
    return this.byId.pipe(
      HashMap.findFirst((_, userId) => Identified.equals(id, userId)),
      Option.map(([_, user]) => user),
    );
  };

  findByEmail = (email: S.EmailAddress): Option.Option<User.Identified> => {
    return this.byId.pipe(
      HashMap.findFirst((user) => user.value.email === email),
      Option.map(([_, user]) => user),
    );
  };

  findByCredential = (credential: Credentials.SecureCredential): Option.Option<User.Identified> => {
    return this.byCredential.pipe(
      HashMap.findFirst((_, cred) => Credentials.equals(cred, credential)),
      Option.flatMap(([_, id]) => this.findById(id)),
    );
  };

  register = (input: User.Registration): [Either.Either<User.Identified, User.EmailAlreadyInUse>, State] => {
    if (Option.isSome(this.findByEmail(input.credentials.email))) {
      return [Either.left(new User.EmailAlreadyInUse({ email: input.credentials.email })), this];
    }

    const [id, ids] = this.ids.next();
    const user = new Identified({
      id,
      value: User.make({
        email: input.credentials.email,
        firstName: input.firstName,
        lastName: input.lastName,
        optInMarketing: input.optInMarketing,
      }),
    });

    const byId = HashMap.set(this.byId, id, user);
    const credentials = HashMap.set(this.byCredential, input.credentials, id);

    return [Either.right(user), new State(credentials, byId, ids)];
  };

  findCredentialsByEmail = (
    email: S.EmailAddress,
  ): Option.Option<ReadonlyArray.NonEmptyArray<Credentials.SecureCredential>> => {
    return this.findByEmail(email).pipe(
      Option.map((user) => HashMap.filter(this.byCredential, (_, cred) => cred.email === user.value.email)),
      Option.map(HashMap.keys),
      Option.map(ReadonlyArray.fromIterable),
      Option.flatMap((a) => (ReadonlyArray.isNonEmptyArray(a) ? Option.some(a) : Option.none())),
    );
  };

  findEmailCredential = (email: S.EmailAddress): Option.Option<EmailPassword.Secure> => {
    return this.findCredentialsByEmail(email).pipe(
      Option.flatMap(ReadonlyArray.findFirst(Credentials.isEmailPassword)),
    );
  };

  findCredentialsById = (id: User.Id): Option.Option<ReadonlyArray.NonEmptyArray<Credentials.SecureCredential>> => {
    return this.findById(id).pipe(
      Option.map((user) => this.byCredential.pipe(HashMap.filter((userId) => Identified.equals(userId, user.id)))),
      Option.map(HashMap.keys),
      Option.map(ReadonlyArray.fromIterable),
      Option.flatMap((a) => (ReadonlyArray.isNonEmptyArray(a) ? Option.some(a) : Option.none())),
    );
  };

  addCredential = (
    id: User.Id,
    credential: Credentials.SecureCredential,
  ): [Either.Either<Credentials.SecureCredential, User.CredentialInUse>, State] => {
    if (Credentials.isEmailPassword(credential) && Option.isSome(this.findEmailCredential(credential.email))) {
      return [Either.left(new User.CredentialInUse()), this];
    }

    const result: [Either.Either<Credentials.SecureCredential, User.CredentialInUse>, State] = this.findByCredential(
      credential,
    ).pipe(
      Option.match({
        onSome: () => [Either.right(credential), this],
        onNone: () => [
          Either.right(credential),
          new State(HashMap.set(this.byCredential, credential, id), this.byId, this.ids),
        ],
      }),
    );

    return result;
  };

  removeCredential = (
    id: User.Id,
    identity: User.identity.Identity,
  ): [Either.Either<User.identity.Identity, User.LastCredentialError | User.NotFound>, State] => {
    const credentials = this.findCredentialsById(id);

    if (Option.isNone(credentials)) {
      return [Either.left(new User.NotFound()), this];
    }

    const newTotal = credentials.value.length - 1;

    if (newTotal < 1) {
      return [Either.left(new User.LastCredentialError()), this];
    }

    return ReadonlyArray.findFirst(credentials.value, (cred) => {
      const that = User.identity.fromCredential(cred);
      return User.identity.equals(identity, that);
    }).pipe(
      Option.match({
        onNone: () => [Either.right(identity), this],
        onSome: (that) => [
          Either.right(identity),
          new State(HashMap.remove(this.byCredential, that), this.byId, this.ids),
        ],
      }),
    );
  };

  update = (id: User.Id, draft: User.Partial): [Either.Either<User.Identified, User.NotFound>, State] => {
    const byId = HashMap.modify(
      this.byId,
      id,
      (user) =>
        new Identified({
          id,
          value: {
            email: user.value.email,
            firstName: draft.firstName ?? user.value.firstName,
            lastName: draft.lastName ?? user.value.lastName,
            optInMarketing: draft.optInMarketing ?? user.value.optInMarketing,
          },
        }),
    );

    const r = HashMap.get(this.byId, id).pipe(Either.fromOption(() => new User.NotFound()));

    return [r, new State(this.byCredential, byId, this.ids)];
  };

  updateEmail = (
    id: User.Id,
    email: S.EmailAddress,
  ): [Either.Either<User.Identified, User.UpdateEmailError>, State] => {
    const error = (e: User.UpdateEmailError): [Either.Either<User.Identified, User.UpdateEmailError>, State] => [
      Either.left(e),
      this,
    ];

    const emailExists = HashMap.findFirst(
      this.byCredential,
      (_, cred) => cred.email === email && Credentials.isEmailPassword(cred),
    );

    if (Option.isSome(emailExists)) {
      return error(new User.EmailAlreadyInUse({ email }));
    }

    return this.findById(id).pipe(
      Option.flatMap((user) =>
        this.findEmailCredential(user.value.email).pipe(
          Option.map((credential) => {
            const newUser = new Identified({ id, value: { ...user.value, email } });
            const newCredential = new EmailPassword.Secure({ email, password: credential.password });
            const byId = HashMap.set(this.byId, id, newUser);
            const byCredential = HashMap.set(this.byCredential, newCredential, id);

            return { state: new State(byCredential, byId, this.ids), user: newUser };
          }),
        ),
      ),
      Option.match({
        onNone: () => error(new User.NotFound()),
        onSome: ({ state, user }) => [Either.right(user), state],
      }),
    );
  };

  updatePassword = (
    id: User.Id,
    email: S.EmailAddress,
    currentPassword: Password.Hashed,
    updatedPassword: Password.Hashed,
  ): State => {
    const currentCredentials = new EmailPassword.Secure({ email, password: currentPassword });
    const updatedCredentials = new EmailPassword.Secure({ email, password: updatedPassword });

    const removed = HashMap.remove(this.byCredential, currentCredentials);
    const byCredentials = HashMap.set(removed, updatedCredentials, id);

    return new State(byCredentials, this.byId, this.ids);
  };

  resetPassword = (
    email: S.EmailAddress,
    password: Password.Hashed,
  ): [Either.Either<User.Identified, Credentials.NotRecognised>, State] => {
    const resetCredentials = new EmailPassword.Secure({ email, password });

    return this.findByEmail(email).pipe(
      Option.flatMap((user) =>
        this.findCredentialsByEmail(email).pipe(
          Option.map(ReadonlyArray.filter(Credentials.isEmailPassword)),
          Option.flatMap(ReadonlyArray.head),
          Option.map((credential) => ({ user, credential })),
        ),
      ),
      Option.match({
        onNone: () => [Either.left(new Credentials.NotRecognised()), this],
        onSome: ({ user, credential }) => {
          const removed = HashMap.remove(this.byCredential, credential);
          const byCredential = HashMap.set(removed, resetCredentials, user.id);

          return [Either.right(user), new State(byCredential, this.byId, this.ids)];
        },
      }),
    );
  };
}
