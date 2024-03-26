import {
  AuthenticateCredential,
  Credential,
  Email,
  Id,
  Identified,
  Password,
  Session,
  Token,
  User,
} from "@chuz/domain";
import { AutoIncrement } from "core/persistence/AutoIncrement";
import { Table } from "core/persistence/Table";
import { Tokens } from "core/tokens/Tokens";
import { Users } from "core/users/Users";
import { Duration, Effect, Either, Option, Ref, identity } from "effect";
import { Passwords } from "..";

const ONE_DAY = Duration.toMillis("1 days");
const TWO_DAYS = Duration.toMillis("2 days");

export class ReferenceUsers implements Users {
  static make = (
    userTokens: Tokens<Id<User>>,
    passwordResetTokens: Tokens<Password.Reset<User>>,
    match: Passwords.Match,
  ) =>
    Effect.gen(function* (_) {
      const state = yield* _(Ref.make(new State(Table.empty(), Table.empty(), Table.empty(), AutoIncrement.empty())));
      return new ReferenceUsers(state, userTokens, passwordResetTokens, match);
    });

  constructor(
    private readonly state: Ref.Ref<State>,
    private readonly userTokens: Tokens<Id<User>>,
    private readonly passwordResetTokens: Tokens<Password.Reset<User>>,
    private readonly match: Passwords.Match,
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

  authenticate = (credential: AuthenticateCredential): Effect.Effect<Session<User>, Credential.NotRecognised> => {
    const findUserByCredential = AuthenticateCredential.match({
      Plain: ({ email, password }) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((state) => state.findCredentialsByEmail(credential.email)),
          Effect.filterOrFail(Credential.isEmailPassword, () => new Credential.NotRecognised()),
          Effect.flatMap((secure) =>
            Effect.if(this.match(password, secure.password), {
              onTrue: this.findByEmail(email),
              onFalse: new Credential.NotRecognised(),
            }),
          ),
          Effect.mapError(() => new Credential.NotRecognised()),
        ),
      Provider: (provider) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((state) => state.findCredentialsByEmail(credential.email)),
          Effect.filterOrFail(Credential.isProvider, () => new Credential.NotRecognised()),
          Effect.filterOrFail(
            (a) => a.id === provider.id,
            () => new Credential.NotRecognised(),
          ),
          Effect.flatMap(({ email }) => this.findByEmail(email)),
          Effect.mapError(() => new Credential.NotRecognised()),
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
    updatedPassword: Password.Hashed,
  ): Effect.Effect<void, Credential.NotRecognised | User.NotFound> => {
    return this.userTokens.lookup(token).pipe(
      Effect.mapError(() => new User.NotFound()),
      Effect.flatMap(this.findById),
      Effect.flatMap((user) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((s) => s.findCredentialsByEmail(user.value.email)),
          Effect.mapError(() => new Credential.NotRecognised()),
          Effect.filterOrFail(Credential.isEmailPassword, () => new Credential.NotRecognised()),
          Effect.flatMap((secure) =>
            // Check the current password is valid and update it
            Effect.if(this.match(currentPassword, secure.password), {
              onTrue: Ref.update(this.state, (s) =>
                s.updatePassword(user.id, user.value.email, secure.password, updatedPassword),
              ),
              onFalse: Effect.fail(new Credential.NotRecognised()),
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

  requestPasswordReset = (email: Email): Effect.Effect<Token<[Email, Id<User>]>, Credential.NotRecognised> =>
    this.findByEmail(email).pipe(
      Effect.mapError(() => new Credential.NotRecognised()),
      Effect.flatMap((user) =>
        this.passwordResetTokens.issue([email, user.id], new Token.TimeToLive({ duration: ONE_DAY })),
      ),
    );

  resetPassword = (
    token: Token<[Email, Id<User>]>,
    password: Password.Hashed,
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
    private readonly byEmail: Table<Email, Credential>,
    private readonly byCredentials: Table<Credential, Id<User>>,
    private readonly byId: Table<Id<User>, Identified<User>>,
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

    return [Either.right(user), new State(byEmail, byCredentials, byId, ids)];
  };

  findById = (id: Id<User>): Option.Option<Identified<User>> => {
    return this.byId.find(id);
  };

  findByEmail = (email: Email): Option.Option<Identified<User>> => {
    return this.byEmail.find(email).pipe(Option.flatMap(this.byCredentials.find), Option.flatMap(this.byId.find));
  };

  findCredentialsByEmail = (email: Email): Option.Option<Credential> => {
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

    return [r, new State(this.byEmail, this.byCredentials, byId, this.ids)];
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
            const updatedCredentials = Credential.isEmailPassword(credentials)
              ? new Credential.EmailPassword.Secure({ email, password: credentials.password })
              : new Credential.Provider({
                  id: credentials.id,
                  email,
                  firstName: credentials.firstName,
                  lastName: credentials.lastName,
                });

            const byEmail = this.byEmail.deleteAt(user.value.email).upsertAt(email, updatedCredentials);
            const byCredentials = this.byCredentials.deleteAt(credentials).upsertAt(updatedCredentials, id);
            const byId = this.byId.upsertAt(id, new Identified({ id, value: { ...user.value, email } }));

            return [
              Either.right(new Identified({ id, value: { ...user.value, email } })),
              new State(byEmail, byCredentials, byId, this.ids),
            ];
          }
        },
      }),
    );
  };

  updatePassword = (
    id: Id<User>,
    email: Email,
    currentPassword: Password.Hashed,
    updatedPassword: Password.Hashed,
  ): State => {
    const currentCredentials = new Credential.EmailPassword.Secure({ email, password: currentPassword });
    const updatedCredentials = new Credential.EmailPassword.Secure({ email, password: updatedPassword });

    const byCredentials = this.byCredentials.deleteAt(currentCredentials).upsertAt(updatedCredentials, id);
    const byEmail = this.byEmail.upsertAt(email, updatedCredentials);

    return new State(byEmail, byCredentials, this.byId, this.ids);
  };

  resetPassword = (
    email: Email,
    password: Password.Hashed,
  ): [Either.Either<Identified<User>, Credential.NotRecognised>, State] => {
    const resetCredentials = new Credential.EmailPassword.Secure({ email, password });

    return this.byEmail.find(email).pipe(
      Option.flatMap((credentials) =>
        this.byCredentials.find(credentials).pipe(
          Option.flatMap(this.byId.find),
          Option.map((user) => ({ user, credentials })),
        ),
      ),
      Option.match({
        onNone: () => [Either.left(new Credential.NotRecognised()), this],
        onSome: ({ user, credentials }) => {
          const byCredentials = this.byCredentials.deleteAt(credentials).upsertAt(resetCredentials, user.id);
          const byEmail = this.byEmail.upsertAt(email, resetCredentials);

          return [Either.right(user), new State(byEmail, byCredentials, this.byId, this.ids)];
        },
      }),
    );
  };
}
