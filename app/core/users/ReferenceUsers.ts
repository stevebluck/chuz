import { Duration, Effect, Either, Option, Ref, identity } from "effect";
import { Id, Identified } from "../Identified";
import { Credentials } from "../auth/Credentials";
import { Password, Passwords } from "../auth/Passwords";
import { Session } from "../auth/Session";
import { Email } from "../emails/Email";
import { AutoIncrement } from "../persistence/AutoIncrement";
import { Table } from "../persistence/Table";
import { NoSuchToken, TimeToLive, Token, Tokens, tokenEq } from "../tokens/Tokens";
import { PasswordReset } from "./ReferencePasswordReset";
import { User, Users } from "./Users";

const ONE_DAY = Duration.toMillis("1 days");
const TWO_DAYS = Duration.toMillis("2 days");

export class ReferenceUsers implements Users {
  static create = (sessionTokens: Tokens<Id<User>>, passwordResetTokens: Tokens<PasswordReset>): Effect.Effect<Users> =>
    Ref.make(new State(Table.empty(), Table.empty(), Table.empty(), AutoIncrement.empty())).pipe(
      Effect.map((s) => new ReferenceUsers(sessionTokens, passwordResetTokens, s)),
    );

  private constructor(
    private sessionTokens: Tokens<Id<User>>,
    private passwordResetTokens: Tokens<[Email, Id<User>]>,
    private state: Ref.Ref<State>,
  ) {}

  register = (
    credentials: Credentials.Secure,
    firstName: User.FirstName,
    lastName: User.LastName,
    optInMarketing: User.OptInMarketing,
  ): Effect.Effect<Session<User>, Email.AlreadyInUse> => {
    return this.state
      .modify((s) => s.register(credentials, firstName, lastName, optInMarketing))
      .pipe(
        Effect.flatMap(identity),
        Effect.flatMap((user) =>
          this.sessionTokens.issue(user.id, TimeToLive(TWO_DAYS)).pipe(Effect.map((token) => Session(user, token))),
        ),
      );
  };

  identify = (token: Token<Id<User>>): Effect.Effect<Session<User>, NoSuchToken> => {
    return this.sessionTokens.lookup(token).pipe(
      Effect.flatMap(this.findById),
      Effect.mapError(() => new NoSuchToken()),
      Effect.map((user) => Session(user, token)),
    );
  };

  authenticate = (credentials: Credentials.Plain): Effect.Effect<Session<User>, Credentials.NotRecognised> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((s) => s.findCredentialsByEmail(credentials.email)),
      Effect.mapError(() => new Credentials.NotRecognised()),
      Effect.flatMap((secure) =>
        Effect.if(Passwords.matches(credentials.password, secure.password), {
          onTrue: this.findByEmail(credentials.email),
          onFalse: Effect.fail(new Credentials.NotRecognised()),
        }),
      ),
      Effect.flatMap((user) =>
        this.sessionTokens.issue(user.id, TimeToLive(TWO_DAYS)).pipe(Effect.map((token) => Session(user, token))),
      ),
      Effect.mapError(() => new Credentials.NotRecognised()),
    );
  };

  logout = (token: Token<Id<User>>): Effect.Effect<void> => this.sessionTokens.revoke(token);

  findById = (id: Id<User>): Effect.Effect<Identified<User>, User.NotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((s) => s.findById(id)),
      Effect.mapError(() => new User.NotFound()),
    );
  };

  findByEmail = (email: Email): Effect.Effect<Identified<User>, User.NotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((s) => s.findByEmail(email)),
      Effect.mapError(() => new User.NotFound()),
    );
  };

  update = (id: Id<User>, draft: User.Draft): Effect.Effect<Identified<User>, User.NotFound> => {
    return Ref.modify(this.state, (s) => s.update(id, draft)).pipe(Effect.flatMap(identity));
  };

  updateEmail = (id: Id<User>, email: Email): Effect.Effect<Identified<User>, User.UpdateEmailError> => {
    return Ref.modify(this.state, (s) => s.updateEmail(id, email)).pipe(Effect.flatMap(identity));
  };

  updatePassword = (
    token: Token<Id<User>>,
    currentPassword: Password.Plaintext,
    updatedPassword: Password.Hashed,
  ): Effect.Effect<void, Credentials.NotRecognised | User.NotFound> => {
    return this.sessionTokens.lookup(token).pipe(
      Effect.mapError(() => new User.NotFound()),
      Effect.flatMap((userId) => this.findById(userId)),
      Effect.flatMap((user) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((s) => s.findCredentialsByEmail(user.value.email)),
          Effect.mapError(() => new Credentials.NotRecognised()),
          Effect.flatMap((secureCredentials) =>
            // Check the current password is valid and update it
            Effect.if(Passwords.matches(currentPassword, secureCredentials.password), {
              onTrue: Ref.update(this.state, (s) =>
                s.updatePassword(user.id, user.value.email, secureCredentials.password, updatedPassword),
              ),
              onFalse: Effect.fail(new Credentials.NotRecognised()),
            }),
          ),
          // Revoke all session tokens except the current one
          Effect.tap(() => {
            return this.sessionTokens.findByValue(user.id).pipe(
              Effect.map((tokens) => tokens.filter((t) => !tokenEq(t, token))),
              Effect.flatMap(this.sessionTokens.revokeMany),
            );
          }),
        ),
      ),
    );
  };
  requestPasswordReset = (email: Email): Effect.Effect<Token<[Email, Id<User>]>, Credentials.NotRecognised> =>
    this.findByEmail(email).pipe(
      Effect.mapError(() => new Credentials.NotRecognised()),
      Effect.flatMap((user) => this.passwordResetTokens.issue([email, user.id], TimeToLive(ONE_DAY))),
    );

  resetPassword = (
    token: Token<[Email, Id<User>]>,
    password: Password.Hashed,
  ): Effect.Effect<Identified<User>, NoSuchToken> =>
    this.passwordResetTokens.lookup(token).pipe(
      Effect.tap(() => this.passwordResetTokens.revoke(token)),
      Effect.flatMap(([email]) =>
        this.state
          .modify((s) => s.resetPassword(email, password))
          .pipe(
            Effect.flatMap(identity),
            Effect.tap((user) => this.sessionTokens.revokeAll(user.id)),
            Effect.orDie,
          ),
      ),
    );
}

class State {
  constructor(
    private readonly byEmail: Table<Email, Credentials.Secure>,
    private readonly byCredentials: Table<Credentials.Secure, Id<User>>,
    private readonly byId: Table<Id<User>, Identified<User>>,
    private readonly ids: AutoIncrement<User>,
  ) {}

  register = (
    credentials: Credentials.Secure,
    firstName: User.FirstName,
    lastName: User.LastName,
    optInMarketing: User.OptInMarketing,
  ): [Either.Either<Email.AlreadyInUse, Identified<User>>, State] => {
    if (this.byEmail.contains(credentials.email)) {
      return [Either.left(new Email.AlreadyInUse({ email: credentials.email })), this];
    }

    const [id, ids] = this.ids.next();
    const user = Identified(id, User.make(firstName, lastName, credentials.email, optInMarketing));

    const byEmail = this.byEmail.upsertAt(credentials.email, credentials);
    const byCredentials = this.byCredentials.upsertAt(credentials, id);
    const byId = this.byId.upsertAt(id, user);

    return [Either.right(user), new State(byEmail, byCredentials, byId, ids)];
  };

  findById = (id: Id<User>): Option.Option<Identified<User>> => {
    return this.byId.find(id);
  };

  findByEmail = (email: Email): Option.Option<Identified<User>> => {
    return this.byEmail.find(email).pipe(Option.flatMap(this.byCredentials.find), Option.flatMap(this.byId.find));
  };

  findCredentialsByEmail = (email: Email): Option.Option<Credentials.Secure> => {
    return this.byEmail.find(email);
  };

  update = (id: Id<User>, draft: User.Draft): [Either.Either<User.NotFound, Identified<User>>, State] => {
    const [r, byId] = this.byId.modifyAt(
      id,
      (user) => Identified(id, { ...user.value, ...draft }),
      new User.NotFound(),
    );

    return [r, new State(this.byEmail, this.byCredentials, byId, this.ids)];
  };

  updateEmail = (id: Id<User>, email: Email): [Either.Either<User.UpdateEmailError, Identified<User>>, State] => {
    const error = (e: User.UpdateEmailError): [Either.Either<User.UpdateEmailError, Identified<User>>, State] => [
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
            const updatedCredentials = new Credentials.Secure({ email, password: credentials.password });
            const byEmail = this.byEmail.deleteAt(user.value.email).upsertAt(email, updatedCredentials);
            const byCredentials = this.byCredentials.deleteAt(credentials).upsertAt(updatedCredentials, id);
            const byId = this.byId.upsertAt(id, Identified(id, { ...user.value, email }));

            return [
              Either.right(Identified(id, { ...user.value, email })),
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
    const currentCredentials = new Credentials.Secure({ email, password: currentPassword });
    const updatedCredentials = new Credentials.Secure({ email, password: updatedPassword });

    const byCredentials = this.byCredentials.deleteAt(currentCredentials).upsertAt(updatedCredentials, id);
    const byEmail = this.byEmail.upsertAt(email, updatedCredentials);

    return new State(byEmail, byCredentials, this.byId, this.ids);
  };

  resetPassword = (
    email: Email,
    password: Password.Hashed,
  ): [Either.Either<Credentials.NotRecognised, Identified<User>>, State] => {
    const resetCredentials = new Credentials.Secure({ email, password });

    return this.byEmail.find(email).pipe(
      Option.flatMap((credentials) =>
        this.byCredentials.find(credentials).pipe(
          Option.flatMap(this.byId.find),
          Option.map((user) => ({
            user,
            credentials,
          })),
        ),
      ),
      Option.match({
        onNone: () => [Either.left(new Credentials.NotRecognised()), this],
        onSome: ({ user, credentials }) => {
          const byCredentials = this.byCredentials.deleteAt(credentials).upsertAt(resetCredentials, user.id);
          const byEmail = this.byEmail.upsertAt(email, resetCredentials);

          return [Either.right(user), new State(byEmail, byCredentials, this.byId, this.ids)];
        },
      }),
    );
  };
}
