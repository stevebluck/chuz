import { Credential, Credentials, Email, Id, Identified, Password, Session, Token, User } from "@chuz/domain";
import { AutoIncrement } from "core/persistence/AutoIncrement";
import { Table } from "core/persistence/Table";
import { Tokens } from "core/tokens/Tokens";
import { Users } from "core/users/Users";
import { Duration, Effect, Either, Option, Ref, identity } from "effect";

const ONE_DAY = Duration.toMillis("1 days");
const TWO_DAYS = Duration.toMillis("2 days");

export class ReferenceUsers implements Users {
  static make = (userTokens: Tokens<Id<User>>, passwordResetTokens: Tokens<Password.Reset<User>>) =>
    Effect.gen(function* (_) {
      const state = yield* _(
        Ref.make(new State(Table.empty(), Table.empty(), Table.empty(), Table.empty(), AutoIncrement.empty())),
      );
      return new ReferenceUsers(state, userTokens, passwordResetTokens);
    });

  constructor(
    private readonly state: Ref.Ref<State>,
    private readonly userTokens: Tokens<Id<User>>,
    private readonly passwordResetTokens: Tokens<Password.Reset<User>>,
  ) {}

  register = (registration: User.Registration): Effect.Effect<Session<User>, Email.AlreadyInUse> => {
    return Ref.modify(this.state, (s) => s.register(registration)).pipe(
      Effect.flatMap(identity),
      Effect.flatMap((user) =>
        this.userTokens
          .issue(user.id, new Token.TimeToLive({ duration: TWO_DAYS }))
          .pipe(Effect.map((token) => new Session({ user, token }))),
      ),
    );
  };

  identify = (token: Token<Id<User>>): Effect.Effect<Session<User>, Token.NoSuchToken> => {
    return this.userTokens.lookup(token).pipe(
      Effect.flatMap(this.findById),
      Effect.mapError(() => new Token.NoSuchToken()),
      Effect.map((user) => new Session({ user, token })),
    );
  };

  logout = (token: Token<Id<User>>): Effect.Effect<void> => this.userTokens.revoke(token);

  findById = (id: Id<User>): Effect.Effect<Identified<User>, User.NotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((s) => s.findById(id)),
      Effect.mapError(() => new User.NotFound()),
    );
  };

  authenticate = (
    credential: Credential,
  ): Effect.Effect<Session<User>, Credentials.NotRecognised | Email.AlreadyInUse> => {
    const createOrGetUser = Credentials.match({
      Plain: ({ email, password }) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((state) => state.findCredentialsByEmail(email)),
          Effect.mapError(() => new Credentials.NotRecognised()),
          Effect.filterOrFail(
            (strong) => Password.Strong.unsafeFrom(password) === strong.password,
            () => new Credentials.NotRecognised(),
          ),
          Effect.flatMap(({ email }) => this.findByEmail(email)),
        ),
      Provider: (provider) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((state) => state.findByProviderId(Id(provider.id))),
          Effect.orElse(() =>
            Ref.modify(this.state, (state) => state.registerFromProvider(provider)).pipe(Effect.flatMap(identity)),
          ),
        ),
    });

    return createOrGetUser(credential).pipe(
      Effect.flatMap((user) =>
        this.userTokens
          .issue(user.id, new Token.TimeToLive({ duration: TWO_DAYS }))
          .pipe(Effect.map((token) => new Session({ user, token }))),
      ),
      Effect.catchTags({ UserNotFound: () => new Credentials.NotRecognised() }),
    );
  };

  findByEmail = (email: Email): Effect.Effect<Identified<User>, User.NotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((s) => s.findByEmail(email)),
      Effect.mapError(() => new User.NotFound()),
    );
  };

  update = (id: Id<User>, draft: User.Partial): Effect.Effect<Identified<User>, User.NotFound> => {
    return Ref.modify(this.state, (s) => s.update(id, draft)).pipe(Effect.flatMap(identity));
  };

  updateEmail = (id: Id<User>, email: Email): Effect.Effect<Identified<User>, User.UpdateEmailError> => {
    return Ref.modify(this.state, (s) => s.updateEmail(id, email)).pipe(Effect.flatMap(identity));
  };

  updatePassword = (
    token: Token<Id<User>>,
    currentPassword: Password.Plaintext,
    updatedPassword: Password.Strong,
  ): Effect.Effect<void, Credentials.NotRecognised | User.NotFound> => {
    return this.userTokens.lookup(token).pipe(
      Effect.mapError(() => new User.NotFound()),
      Effect.flatMap(this.findById),
      Effect.flatMap((user) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((s) => s.findCredentialsByEmail(user.value.email)),
          Effect.mapError(() => new Credentials.NotRecognised()),
          Effect.filterOrFail(
            (secure) => Password.Strong.unsafeFrom(currentPassword) === secure.password,
            () => new Credentials.NotRecognised(),
          ),
          Effect.flatMap(({ password }) =>
            // Check the current password is valid and update it
            Ref.update(this.state, (s) => s.updatePassword(user.id, user.value.email, password, updatedPassword)),
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

  requestPasswordReset = (email: Email): Effect.Effect<Token<[Email, Id<User>]>, Credentials.NotRecognised> =>
    this.findByEmail(email).pipe(
      Effect.mapError(() => new Credentials.NotRecognised()),
      Effect.flatMap((user) =>
        this.passwordResetTokens.issue([email, user.id], new Token.TimeToLive({ duration: ONE_DAY })),
      ),
    );

  resetPassword = (
    token: Token<[Email, Id<User>]>,
    password: Password.Strong,
  ): Effect.Effect<Identified<User>, Token.NoSuchToken> =>
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
}

class State {
  constructor(
    private readonly byEmail: Table<Email, Credentials.EmailPassword.Strong>,
    private readonly byCredentials: Table<Credentials.EmailPassword.Strong, Id<User>>,
    private readonly byId: Table<Id<User>, Identified<User>>,
    private readonly byProviderId: Table<Id<Credentials.Provider>, Id<User>>,
    private readonly ids: AutoIncrement<User>,
  ) {}

  register = (input: User.Registration): [Either.Either<Identified<User>, Email.AlreadyInUse>, State] => {
    if (this.byEmail.contains(input.credentials.email)) {
      return [Either.left(new Email.AlreadyInUse({ email: input.credentials.email })), this];
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

    const byEmail = this.byEmail.upsertAt(input.credentials.email, input.credentials);
    const byCredentials = this.byCredentials.upsertAt(input.credentials, id);
    const byId = this.byId.upsertAt(id, user);

    return [Either.right(user), new State(byEmail, byCredentials, byId, this.byProviderId, ids)];
  };

  registerFromProvider = (
    provider: Credentials.Provider,
  ): [Either.Either<Identified<User>, Email.AlreadyInUse>, State] => {
    if (this.byEmail.contains(provider.user.email)) {
      return [Either.left(new Email.AlreadyInUse({ email: provider.user.email })), this];
    }

    const [id, ids] = this.ids.next();
    const identifiedUser = new Identified({ id, value: provider.user });
    const credentials = new Credentials.EmailPassword.Strong({
      email: provider.user.email,
      password: Password.Strong.unsafeFrom("whatever"),
    });

    const byProviderId = this.byProviderId.upsertAt(Id(provider.id), id);
    const byEmail = this.byEmail.upsertAt(provider.user.email, credentials);
    const byCredentials = this.byCredentials.upsertAt(credentials, id);
    const byId = this.byId.upsertAt(id, identifiedUser);

    return [Either.right(identifiedUser), new State(byEmail, byCredentials, byId, byProviderId, ids)];
  };

  findById = (id: Id<User>): Option.Option<Identified<User>> => {
    return this.byId.find(id);
  };

  findByProviderId = (id: Id<Credentials.Provider>): Option.Option<Identified<User>> => {
    return this.byProviderId.find(id).pipe(Option.flatMap(this.byId.find));
  };

  findByEmail = (email: Email): Option.Option<Identified<User>> => {
    return this.byEmail.find(email).pipe(Option.flatMap(this.byCredentials.find), Option.flatMap(this.byId.find));
  };

  findCredentialsByEmail = (email: Email): Option.Option<Credentials.EmailPassword.Strong> => {
    return this.byEmail.find(email);
  };

  update = (id: Id<User>, draft: User.Partial): [Either.Either<Identified<User>, User.NotFound>, State] => {
    const [r, byId] = this.byId.modifyAt(
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
      new User.NotFound(),
    );

    return [r, new State(this.byEmail, this.byCredentials, byId, this.byProviderId, this.ids)];
  };

  updateEmail = (id: Id<User>, email: Email): [Either.Either<Identified<User>, User.UpdateEmailError>, State] => {
    const error = (e: User.UpdateEmailError): [Either.Either<Identified<User>, User.UpdateEmailError>, State] => [
      Either.left(e),
      this,
    ];

    return this.byId.find(id).pipe(
      Option.flatMap((user) =>
        this.byEmail.find(user.value.email).pipe(Option.map((credentials) => ({ user, credentials }))),
      ),
      Option.match({
        onNone: () => error(new User.NotFound()),
        onSome: ({ user, credentials }) => {
          // Noop if the email already matches user email
          if (Email.equals(user.value.email, email)) {
            return [Either.right(user), this];
            // Error if the new email is already in use
          } else if (this.byEmail.contains(email)) {
            return error(new Email.AlreadyInUse({ email }));
          } else {
            const updatedCredentials = new Credentials.EmailPassword.Strong({ email, password: credentials.password });
            const byEmail = this.byEmail.deleteAt(user.value.email).upsertAt(email, updatedCredentials);
            const byCredentials = this.byCredentials.deleteAt(credentials).upsertAt(updatedCredentials, id);
            const byId = this.byId.upsertAt(id, new Identified({ id, value: { ...user.value, email } }));

            return [
              Either.right(new Identified({ id, value: { ...user.value, email } })),
              new State(byEmail, byCredentials, byId, this.byProviderId, this.ids),
            ];
          }
        },
      }),
    );
  };

  updatePassword = (
    id: Id<User>,
    email: Email,
    currentPassword: Password.Strong,
    updatedPassword: Password.Strong,
  ): State => {
    const currentCredentials = new Credentials.EmailPassword.Strong({ email, password: currentPassword });
    const updatedCredentials = new Credentials.EmailPassword.Strong({ email, password: updatedPassword });

    const byCredentials = this.byCredentials.deleteAt(currentCredentials).upsertAt(updatedCredentials, id);
    const byEmail = this.byEmail.upsertAt(email, updatedCredentials);

    return new State(byEmail, byCredentials, this.byId, this.byProviderId, this.ids);
  };

  resetPassword = (
    email: Email,
    password: Password.Strong,
  ): [Either.Either<Identified<User>, Credentials.NotRecognised>, State] => {
    const resetCredentials = new Credentials.EmailPassword.Strong({ email, password });

    return this.byEmail.find(email).pipe(
      Option.flatMap((credentials) =>
        this.byCredentials.find(credentials).pipe(
          Option.flatMap(this.byId.find),
          Option.map((user) => ({ user, credentials })),
        ),
      ),
      Option.match({
        onNone: () => [Either.left(new Credentials.NotRecognised()), this],
        onSome: ({ user, credentials }) => {
          const byCredentials = this.byCredentials.deleteAt(credentials).upsertAt(resetCredentials, user.id);
          const byEmail = this.byEmail.upsertAt(email, resetCredentials);

          return [Either.right(user), new State(byEmail, byCredentials, this.byId, this.byProviderId, this.ids)];
        },
      }),
    );
  };
}
