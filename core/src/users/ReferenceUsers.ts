import {
  Credentials,
  IdentityProvider,
  EmailPassword,
  Id,
  Identified,
  Password,
  Session,
  Token,
  User,
} from "@chuz/domain";
import { Duration, Effect, Either, Equal, Option, Ref, identity } from "@chuz/prelude";
import { AutoIncrement } from "core/persistence/AutoIncrement";
import { Table } from "core/persistence/Table";
import { Tokens } from "core/tokens/Tokens";
import { Users } from "core/users/Users";
import { Passwords } from "..";

const ONE_DAY = Duration.toMillis("1 days");
const TWO_DAYS = Duration.toMillis("2 days");

export class ReferenceUsers implements Users {
  static make = (
    userTokens: Tokens<User.Id>,
    passwordResetTokens: Tokens<Password.Reset<User.User>>,
    match: Passwords.Match,
  ): Effect.Effect<Users> =>
    Effect.gen(function* (_) {
      const state = yield* _(Ref.make(new State(Table.empty(), Table.empty(), Table.empty(), AutoIncrement.empty())));
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

  authenticate = (credential: Credentials.Plain): Effect.Effect<User.Session, Credentials.NotRecognised> => {
    const findUserByCredential = Credentials.matchPlain({
      Plain: ({ email, password }) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((state) => state.findCredentialsByEmail(email)),
          Effect.filterOrFail(Credentials.isEmailPassword, () => new Credentials.NotRecognised()),
          Effect.flatMap((secure) =>
            Effect.if(this.match(password, secure.password), {
              onTrue: this.findByEmail(email),
              onFalse: new Credentials.NotRecognised(),
            }),
          ),
          Effect.mapError(() => new Credentials.NotRecognised()),
        ),
      IdentityProvider: (credential) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((state) => state.findCredentialsByEmail(credential.email)),
          Effect.filterOrFail(Credentials.isProvider, () => new Credentials.NotRecognised()),
          Effect.filterOrFail(
            (provider) => IdentityProvider.equals(provider, credential),
            () => new Credentials.NotRecognised(),
          ),
          Effect.flatMap(({ email }) => this.findByEmail(email)),
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

  findByEmail = (email: User.Email): Effect.Effect<Identified<User.User>, User.NotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((s) => s.findByEmail(email)),
      Effect.mapError(() => new User.NotFound()),
    );
  };

  update = (id: User.Id, draft: User.Partial): Effect.Effect<User.Identified, User.NotFound> => {
    return Ref.modify(this.state, (s) => s.update(id, draft)).pipe(Effect.flatMap(identity));
  };

  updateEmail = (id: User.Id, email: User.Email): Effect.Effect<User.Identified, User.UpdateEmailError> => {
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
          Effect.flatMap((s) => s.findCredentialsByEmail(user.value.email)),
          Effect.mapError(() => new Credentials.NotRecognised()),
          Effect.filterOrFail(Credentials.isEmailPassword, () => new Credentials.NotRecognised()),
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
    email: User.Email,
  ): Effect.Effect<Token.Token<[User.Email, User.Id]>, Credentials.NotRecognised> =>
    this.findByEmail(email).pipe(
      Effect.mapError(() => new Credentials.NotRecognised()),
      Effect.flatMap((user) =>
        this.passwordResetTokens.issue([email, user.id], new Token.TimeToLive({ duration: ONE_DAY })),
      ),
    );

  resetPassword = (
    token: Token.Token<[User.Email, User.Id]>,
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
}

class State {
  constructor(
    private readonly byEmail: Table<User.Email, Credentials.Secure>,
    private readonly byCredentials: Table<Credentials.Secure, User.Id>,
    private readonly byId: Table<User.Id, User.Identified>,
    private readonly ids: AutoIncrement<User.User>,
  ) {}

  register = (input: User.Registration): [Either.Either<User.Identified, User.EmailAlreadyInUse>, State] => {
    if (this.byEmail.contains(input.credentials.email)) {
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

    const byEmail = this.byEmail.upsertAt(input.credentials.email, input.credentials);
    const byCredentials = this.byCredentials.upsertAt(input.credentials, id);
    const byId = this.byId.upsertAt(id, user);

    return [Either.right(user), new State(byEmail, byCredentials, byId, ids)];
  };

  findById = (id: User.Id): Option.Option<User.Identified> => {
    return this.byId.find(id);
  };

  findByEmail = (email: User.Email): Option.Option<User.Identified> => {
    return this.byEmail.find(email).pipe(Option.flatMap(this.byCredentials.find), Option.flatMap(this.byId.find));
  };

  findCredentialsByEmail = (email: User.Email): Option.Option<Credentials.Secure> => {
    return this.byEmail.find(email);
  };

  update = (id: User.Id, draft: User.Partial): [Either.Either<User.Identified, User.NotFound>, State] => {
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

  updateEmail = (id: User.Id, email: User.Email): [Either.Either<User.Identified, User.UpdateEmailError>, State] => {
    const error = (e: User.UpdateEmailError): [Either.Either<User.Identified, User.UpdateEmailError>, State] => [
      Either.left(e),
      this,
    ];

    return this.byId.find(id).pipe(
      Option.flatMap((user) =>
        this.byEmail.find(user.value.email).pipe(Option.map((credential) => ({ user, credential }))),
      ),
      Option.match({
        onNone: () => error(new User.NotFound()),
        onSome: ({ user, credential }) => {
          // Noop if the email already matches user email
          if (Equal.equals(user.value.email, email)) {
            return [Either.right(user), this];
            // Error if the new email is already in use
          } else if (this.byEmail.contains(email)) {
            return error(new User.EmailAlreadyInUse({ email }));
          } else {
            // TODO: user can't update email if they are using a provider credential
            // TODO: add Credential.Email and User.Email
            // TODO: add test
            const updatedCredentials = Credentials.isEmailPassword(credential)
              ? new EmailPassword.Secure({ email, password: credential.password })
              : new IdentityProvider({ id: credential.id, email, provider: credential.provider });

            const byEmail = this.byEmail.deleteAt(user.value.email).upsertAt(email, updatedCredentials);
            const byCredentials = this.byCredentials.deleteAt(credential).upsertAt(updatedCredentials, id);
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
    id: User.Id,
    email: User.Email,
    currentPassword: Password.Hashed,
    updatedPassword: Password.Hashed,
  ): State => {
    const currentCredentials = new EmailPassword.Secure({ email, password: currentPassword });
    const updatedCredentials = new EmailPassword.Secure({ email, password: updatedPassword });

    const byCredentials = this.byCredentials.deleteAt(currentCredentials).upsertAt(updatedCredentials, id);
    const byEmail = this.byEmail.upsertAt(email, updatedCredentials);

    return new State(byEmail, byCredentials, this.byId, this.ids);
  };

  resetPassword = (
    email: User.Email,
    password: Password.Hashed,
  ): [Either.Either<User.Identified, Credentials.NotRecognised>, State] => {
    const resetCredentials = new EmailPassword.Secure({ email, password });

    return this.byEmail.find(email).pipe(
      Option.flatMap((credential) =>
        this.byCredentials.find(credential).pipe(
          Option.flatMap(this.byId.find),
          Option.map((user) => ({ user, credential })),
        ),
      ),
      Option.match({
        onNone: () => [Either.left(new Credentials.NotRecognised()), this],
        onSome: ({ user, credential }) => {
          const byCredentials = this.byCredentials.deleteAt(credential).upsertAt(resetCredentials, user.id);
          const byEmail = this.byEmail.upsertAt(email, resetCredentials);

          return [Either.right(user), new State(byEmail, byCredentials, this.byId, this.ids)];
        },
      }),
    );
  };
}
