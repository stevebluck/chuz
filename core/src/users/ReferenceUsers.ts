import { Credential, Email, Identified, Password, Session, Token, User } from "@chuz/domain";
import { Array, Duration, Effect, Either, HashMap, Option, Predicate, Ref, identity } from "@chuz/prelude";
import { Passwords } from "core/auth/Passwords";
import { AutoIncrement } from "core/persistence/AutoIncrement";
import { Tokens } from "core/tokens/Tokens";
import {
  LinkCredentialError,
  EmailAlreadyInUse,
  Registration,
  UnlinkCredentialError,
  UserNotFound,
  Users,
} from "core/users/Users";

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

  private compareCredentials = (
    credential: Credential.Plain,
  ): Effect.Effect<User.Identified, Credential.NotRecognised> => {
    if (Credential.isPlainEmailPassword(credential)) {
      return this.getByEmail(credential.email).pipe(
        Effect.flatMap((user) => Effect.map(Ref.get(this.state), (state) => state.findCredentialsById(user.id))),
        Effect.flatMap(Array.findFirst(Credential.isEmailPassword)),
        Effect.flatMap((emailCredential) => this.match(credential.password, emailCredential.password)),
        Effect.filterOrFail(Predicate.isTruthy, () => new Credential.NotRecognised()),
        Effect.flatMap(() => this.getByEmail(credential.email)),
        Effect.mapError(() => new Credential.NotRecognised()),
      );
    }

    return Ref.get(this.state).pipe(
      Effect.flatMap((state) => state.findByCredential(credential)),
      Effect.mapError(() => new Credential.NotRecognised()),
    );
  };

  register = (registration: Registration): Effect.Effect<User.Session, EmailAlreadyInUse> => {
    return this.getByEmail(registration.credentials.email).pipe(
      Effect.flatMap(() => new EmailAlreadyInUse({ email: registration.credentials.email })),
      Effect.catchTag("UserNotFound", () => Ref.modify(this.state, (state) => state.register(registration))),
      Effect.flatMap((user) =>
        this.userTokens
          .issue(user.id, new Token.TimeToLive({ duration: TWO_DAYS }))
          .pipe(Effect.map((token) => new Session({ user, token }))),
      ),
    );
  };

  identify = (token: User.Token): Effect.Effect<User.Session, Token.NoSuchToken> => {
    return this.userTokens.lookup(token).pipe(
      Effect.flatMap(this.getById),
      Effect.map((user) => new Session({ user, token })),
      Effect.catchTag("UserNotFound", () => new Token.NoSuchToken()),
    );
  };

  logout = (token: User.Token): Effect.Effect<void> => {
    return this.userTokens.revoke(token);
  };

  authenticate = (credential: Credential.Plain.Email): Effect.Effect<User.Session, Credential.NotRecognised> => {
    return this.compareCredentials(credential).pipe(
      Effect.flatMap((user) =>
        this.userTokens
          .issue(user.id, new Token.TimeToLive({ duration: TWO_DAYS }))
          .pipe(Effect.map((token) => new Session({ user, token }))),
      ),
    );
  };

  identities = (id: User.Id): Effect.Effect<User.identity.Identities> => {
    return Ref.get(this.state).pipe(Effect.map((state) => state.identities(id)));
  };

  getById = (id: User.Id): Effect.Effect<User.Identified, UserNotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((state) => state.findById(id)),
      Effect.mapError(() => new UserNotFound()),
    );
  };

  getByEmail = (email: Email): Effect.Effect<User.Identified, UserNotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((s) => s.findByEmail(email)),
      Effect.mapError(() => new UserNotFound()),
    );
  };

  update = (id: User.Id, draft: User.Partial): Effect.Effect<User.Identified, UserNotFound> => {
    return this.getById(id).pipe(Effect.tap(() => Ref.modify(this.state, (s) => s.update(id, draft))));
  };

  updateEmail = (id: User.Id, email: Email): Effect.Effect<User.Identified, UserNotFound | EmailAlreadyInUse> => {
    return this.getByEmail(email).pipe(
      Effect.flatMap(() => new EmailAlreadyInUse({ email })),
      Effect.catchTag("UserNotFound", () =>
        Ref.modify(this.state, (state) => state.updateEmail(id, email)).pipe(
          Effect.flatMap(identity),
          Effect.mapError(() => new UserNotFound()),
        ),
      ),
    );
  };

  updatePassword = (
    token: User.Token,
    currentPassword: Password.Plaintext,
    updatedPassword: Password.Hashed,
  ): Effect.Effect<void, Token.NoSuchToken | Credential.NotRecognised> => {
    return this.userTokens.lookup(token).pipe(
      Effect.flatMap(this.getById),
      Effect.map((user) => Credential.Plain.Email({ email: user.value.email, password: currentPassword })),
      Effect.flatMap(this.compareCredentials),
      Effect.tap((user) => Ref.modify(this.state, (s) => s.updatePassword(user.id, updatedPassword))),
      Effect.tap((user) =>
        this.userTokens.findByValue(user.id).pipe(
          Effect.map((tokens) => tokens.filter((t) => !Token.equals(t, token))),
          Effect.flatMap(this.userTokens.revokeMany),
        ),
      ),
      Effect.catchTag("UserNotFound", () => new Token.NoSuchToken()),
    );
  };

  requestPasswordReset = (email: Email): Effect.Effect<Token.Token<[Email, User.Id]>, Credential.NotRecognised> => {
    return this.getByEmail(email).pipe(
      Effect.flatMap((user) =>
        this.passwordResetTokens.issue([email, user.id], new Token.TimeToLive({ duration: ONE_DAY })),
      ),
      Effect.catchTag("UserNotFound", () => new Credential.NotRecognised()),
    );
  };

  resetPassword = (
    token: Token.Token<[Email, User.Id]>,
    password: Password.Hashed,
  ): Effect.Effect<User.Identified, Token.NoSuchToken> => {
    return this.passwordResetTokens.lookup(token).pipe(
      Effect.tap(() => this.passwordResetTokens.revoke(token)),
      Effect.flatMap(([, id]) => this.state.modify((s) => s.updatePassword(id, password))),
      Effect.flatMap(Either.fromOption(() => new Token.NoSuchToken())),
      Effect.tap((user) => this.userTokens.revokeAll(user.id)),
    );
  };

  linkCredential = (
    token: User.Token,
    credential: Credential.Secure,
  ): Effect.Effect<User.identity.Identities, LinkCredentialError> => {
    return Effect.all([this.userTokens.lookup(token), Ref.get(this.state)]).pipe(
      Effect.filterOrFail(
        ([_, state]) => Option.isNone(state.findByCredential(credential)),
        () => new Credential.AlreadyExists(),
      ),
      Effect.flatMap(([id]) => Ref.modify(this.state, (s) => s.linkCredential(id, credential))),
    );
  };

  unlinkCredential = (
    token: User.Token,
    providerId: Credential.ProviderId,
  ): Effect.Effect<User.identity.Identities, UnlinkCredentialError> => {
    // TODO: work over credentials, not identities
    return Effect.all([this.userTokens.lookup(token), Ref.get(this.state)]).pipe(
      Effect.map(([id, state]) => [id, state.identities(id)] as const),
      Effect.filterOrFail(
        ([, identities]) => {
          return (
            (Credential.eqv(providerId, Credential.ProviderId.Email) && User.identity.hasSocialIdentity(identities)) ||
            (!Credential.eqv(providerId, Credential.ProviderId.Email) && User.identity.hasEmailIdentity(identities))
          );
        },
        () => new Credential.NoFallbackAvailable(),
      ),
      Effect.flatMap(([userId]) => Ref.modify(this.state, (s) => s.unlinkCredential(userId, providerId))),
    );
  };
}

class State {
  constructor(
    private readonly users: HashMap.HashMap<User.Id, User.Identified>,
    private readonly credentials: HashMap.HashMap<Credential.Secure, User.Id>,
    private readonly ids: AutoIncrement<User.User>,
  ) {}

  private toIdentities = (
    id: User.Id,
    credentials: HashMap.HashMap<Credential.Secure, User.Id>,
  ): readonly [User.identity.Identities, State] => {
    const usersCredentials = HashMap.filter(credentials, (userId) => User.eqId(userId, id)).pipe(
      HashMap.map((_, credential) => credential),
    );

    const Email = HashMap.findFirst(usersCredentials, (cred) => Credential.is(Credential.ProviderId.Email, cred)).pipe(
      Option.map(([, cred]) => User.identity.fromCredential(cred)),
    );

    const Apple = HashMap.findFirst(usersCredentials, (cred) => Credential.is(Credential.ProviderId.Apple, cred)).pipe(
      Option.map(([, cred]) => User.identity.fromCredential(cred)),
    );

    const Google = HashMap.findFirst(usersCredentials, (cred) =>
      Credential.is(Credential.ProviderId.Google, cred),
    ).pipe(Option.map(([, cred]) => User.identity.fromCredential(cred)));

    return [{ Email, Apple, Google }, new State(this.users, credentials, this.ids)] as const;
  };

  findById = (id: User.Id): Option.Option<User.Identified> => {
    return HashMap.get(this.users, id);
  };

  findByEmail = (email: Email): Option.Option<User.Identified> => {
    return HashMap.findFirst(this.users, (user) => user.value.email === email).pipe(Option.map(([_, user]) => user));
  };

  identities = (id: User.Id): User.identity.Identities => {
    const [identities] = this.toIdentities(id, this.credentials);
    return identities;
  };

  findCredentialsById = (id: User.Id): Array<Credential.Secure> => {
    return HashMap.filter(this.credentials, (userId) => User.eqId(userId, id)).pipe(HashMap.keys, Array.fromIterable);
  };

  findByCredential = (credential: Credential.Secure): Option.Option<User.Identified> => {
    return HashMap.get(this.credentials, credential).pipe(Option.flatMap((id) => HashMap.get(this.users, id)));
  };

  register = (input: Registration): [User.Identified, State] => {
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

    const users = HashMap.set(this.users, id, user);
    const credentials = HashMap.set(this.credentials, input.credentials, id);

    return [user, new State(users, credentials, ids)];
  };

  update = (id: User.Id, draft: User.Partial): [Option.Option<User.Identified>, State] => {
    const users = HashMap.modify(
      this.users,
      id,
      (user) =>
        new Identified({
          id,
          value: {
            email: user.value.email,
            firstName: draft.firstName,
            lastName: draft.lastName,
            optInMarketing: draft.optInMarketing,
          },
        }),
    );

    const user = HashMap.get(users, id);

    return [
      user,
      user.pipe(
        Option.map(() => new State(users, this.credentials, this.ids)),
        Option.getOrElse(() => this),
      ),
    ];
  };

  updateEmail = (id: User.Id, email: Email): [Option.Option<User.Identified>, State] => {
    const users = HashMap.modify(
      this.users,
      id,
      (user) => new Identified({ id: user.id, value: { ...user.value, email } }),
    );

    const credentials = Array.findFirst(this.findCredentialsById(id), Credential.isEmailPassword).pipe(
      Option.map((cred) => [HashMap.remove(this.credentials, cred), cred] as const),
      Option.map(([creds, cred]) =>
        HashMap.set(creds, Credential.Secure.Email({ email, password: cred.password }), id),
      ),
      Option.getOrElse(() => this.credentials),
    );

    const user = HashMap.get(users, id);

    return [
      user,
      user.pipe(
        Option.map(() => new State(users, credentials, this.ids)),
        Option.getOrElse(() => this),
      ),
    ];
  };

  updatePassword = (id: User.Id, password: Password.Hashed): [Option.Option<User.Identified>, State] => {
    const credentials = Array.findFirst(this.findCredentialsById(id), Credential.isEmailPassword).pipe(
      Option.map((cred) => [HashMap.remove(this.credentials, cred), cred] as const),
      Option.map(([creds, cred]) => HashMap.set(creds, Credential.Secure.Email({ email: cred.email, password }), id)),
      Option.getOrElse(() => this.credentials),
    );

    const user = this.findById(id);

    return [
      user,
      user.pipe(
        Option.map(() => new State(this.users, credentials, this.ids)),
        Option.getOrElse(() => this),
      ),
    ];
  };

  linkCredential = (id: User.Id, credential: Credential.Secure): readonly [User.identity.Identities, State] => {
    const credentials = HashMap.set(this.credentials, credential, id);

    return this.toIdentities(id, credentials);
  };

  unlinkCredential = (id: User.Id, providerId: Credential.ProviderId): readonly [User.identity.Identities, State] => {
    const credentials = Array.findFirst(this.findCredentialsById(id), (cred) => Credential.is(providerId, cred)).pipe(
      Option.map((cred) => HashMap.remove(this.credentials, cred)),
      Option.getOrElse(() => this.credentials),
    );

    return this.toIdentities(id, credentials);
  };
}
