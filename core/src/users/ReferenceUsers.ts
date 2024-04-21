import { Credential, Identified, Password, Session, Token, User } from "@chuz/domain";
import {
  Duration,
  Effect,
  Either,
  HashMap,
  Option,
  Predicate,
  ReadonlyArray,
  Ref,
  S,
  Tuple,
  identity,
} from "@chuz/prelude";
import { Passwords } from "core/auth/Passwords";
import { AutoIncrement } from "core/persistence/AutoIncrement";
import { Tokens } from "core/tokens/Tokens";
import {
  AddCredentialError,
  EmailAlreadyInUse,
  PasswordAlreadySet,
  Registration,
  RemoveCredentialError,
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
      const state = yield* _(
        Ref.make(new State(HashMap.empty(), HashMap.empty(), HashMap.empty(), AutoIncrement.empty())),
      );
      return new ReferenceUsers(state, userTokens, passwordResetTokens, match);
    });

  constructor(
    private readonly state: Ref.Ref<State>,
    private readonly userTokens: Tokens<User.Id>,
    private readonly passwordResetTokens: Tokens<Password.Reset<User.User>>,
    private readonly match: Passwords.Match,
  ) {}

  private compareCredentials: (input: Credential.Plain) => Effect.Effect<User.Identified, Credential.NotRecognised> =
    Credential.matchPlain({
      Plain: (credential) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((state) => state.findPasswordByEmail(credential.email)),
          Effect.flatMap((password) => this.match(credential.password, password)),
          Effect.filterOrFail(Predicate.isTruthy, () => new Credential.NotRecognised()),
          Effect.flatMap(() => this.getByEmail(credential.email)),
          Effect.mapError(() => new Credential.NotRecognised()),
        ),
      Social: (credential) =>
        Ref.get(this.state).pipe(
          Effect.flatMap((state) => state.findByCredential(credential)),
          Effect.mapError(() => new Credential.NotRecognised()),
        ),
    });

  register = (registration: Registration): Effect.Effect<User.Session, EmailAlreadyInUse> => {
    return Ref.get(this.state).pipe(
      Effect.filterOrFail(
        (state) => Option.isNone(state.findByEmail(registration.credentials.email)),
        () => new EmailAlreadyInUse({ email: registration.credentials.email }),
      ),
      Effect.flatMap(() => Ref.modify(this.state, (state) => state.register(registration))),
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

  authenticate = (credential: Credential.Plain): Effect.Effect<User.Session, Credential.NotRecognised> => {
    return this.compareCredentials(credential).pipe(
      Effect.flatMap((user) =>
        this.userTokens
          .issue(user.id, new Token.TimeToLive({ duration: TWO_DAYS }))
          .pipe(Effect.map((token) => new Session({ user, token }))),
      ),
    );
  };

  identities = (id: User.Id): Effect.Effect<User.identity.Identities> => {
    return Ref.get(this.state).pipe(
      Effect.map((state) => Tuple.make(state.findEmailCredentialById(id), state.findSocialCredentialsById(id))),
    );
  };

  getById = (id: User.Id): Effect.Effect<User.Identified, UserNotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((state) => state.findById(id)),
      Effect.mapError(() => new UserNotFound()),
    );
  };

  getByEmail = (email: S.EmailAddress): Effect.Effect<User.Identified, UserNotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((s) => s.findByEmail(email)),
      Effect.mapError(() => new UserNotFound()),
    );
  };

  update = (id: User.Id, draft: User.Partial): Effect.Effect<User.Identified, UserNotFound> => {
    return this.getById(id).pipe(Effect.tap(() => Ref.modify(this.state, (s) => s.update(id, draft))));
  };

  updateEmail = (
    id: User.Id,
    email: S.EmailAddress,
  ): Effect.Effect<User.Identified, UserNotFound | EmailAlreadyInUse> => {
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

  setPassword = (
    token: User.Token,
    password: Password.Hashed,
  ): Effect.Effect<User.Identified, Token.NoSuchToken | PasswordAlreadySet> => {
    return Effect.all([this.userTokens.lookup(token), Ref.get(this.state)]).pipe(
      Effect.filterOrFail(
        ([id, state]) => Option.isNone(state.findEmailCredentialById(id)),
        () => new PasswordAlreadySet(),
      ),
      Effect.flatMap(([id]) => this.getById(id)),
      Effect.map((user) => ({
        user,
        credential: new Credential.EmailPassword.Secure({ email: user.value.email, password }),
      })),
      Effect.tap(({ user, credential }) => Ref.modify(this.state, (s) => s.setPassword(user.id, credential))),
      Effect.map(({ user }) => user),
      Effect.catchTag("UserNotFound", () => new Token.NoSuchToken()),
    );
  };

  removePassword = (token: User.Token): Effect.Effect<void, Token.NoSuchToken | Credential.NoFallbackAvailable> => {
    return Effect.all([this.userTokens.lookup(token), Ref.get(this.state)]).pipe(
      Effect.filterOrFail(
        ([id, state]) => ReadonlyArray.isNonEmptyArray(state.findSocialCredentialsById(id)),
        () => new Credential.NoFallbackAvailable(),
      ),
      Effect.tap(([id]) => Ref.modify(this.state, (s) => s.removePassword(id))),
      Effect.asUnit,
    );
  };

  updatePassword = (
    token: User.Token,
    currentPassword: Password.Plaintext,
    updatedPassword: Password.Hashed,
  ): Effect.Effect<void, Token.NoSuchToken | Credential.NotRecognised> => {
    return this.userTokens.lookup(token).pipe(
      Effect.flatMap(this.getById),
      Effect.map((user) => new Credential.EmailPassword.Plain({ email: user.value.email, password: currentPassword })),
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

  requestPasswordReset = (
    email: S.EmailAddress,
  ): Effect.Effect<Token.Token<[S.EmailAddress, User.Id]>, Credential.NotRecognised> => {
    return this.getByEmail(email).pipe(
      Effect.flatMap((user) =>
        this.passwordResetTokens.issue([email, user.id], new Token.TimeToLive({ duration: ONE_DAY })),
      ),
      Effect.catchTag("UserNotFound", () => new Credential.NotRecognised()),
    );
  };

  resetPassword = (
    token: Token.Token<[S.EmailAddress, User.Id]>,
    password: Password.Hashed,
  ): Effect.Effect<User.Identified, Token.NoSuchToken> => {
    return this.passwordResetTokens.lookup(token).pipe(
      Effect.tap(() => this.passwordResetTokens.revoke(token)),
      Effect.flatMap(([, id]) => this.state.modify((s) => s.updatePassword(id, password))),
      Effect.flatMap(Either.fromOption(() => new Token.NoSuchToken())),
      Effect.tap((user) => this.userTokens.revokeAll(user.id)),
    );
  };

  addSocialCredential = (
    token: User.Token,
    credential: Credential.Social,
  ): Effect.Effect<Array<Credential.Social>, AddCredentialError> => {
    return Effect.all([this.userTokens.lookup(token), Ref.get(this.state)]).pipe(
      Effect.filterOrFail(
        ([_, state]) => Option.isNone(state.findByCredential(credential)),
        () => new Credential.InUse(),
      ),
      Effect.flatMap(([id]) => Ref.modify(this.state, (s) => s.addSocialCredential(id, credential))),
    );
  };

  removeSocialCredential = (
    token: User.Token,
    id: Credential.SocialId,
  ): Effect.Effect<Array<Credential.Social>, RemoveCredentialError> => {
    return Effect.all([this.userTokens.lookup(token), Ref.get(this.state)]).pipe(
      Effect.map(([id, state]) =>
        Tuple.make(id, state.findEmailCredentialById(id), state.findSocialCredentialsById(id)),
      ),
      Effect.filterOrFail(
        ([, emailCredential, socialCredentials]) =>
          Credential.hasFallbackCredential(emailCredential, socialCredentials),
        () => new Credential.NoFallbackAvailable(),
      ),
      Effect.flatMap(([userId]) => Ref.modify(this.state, (s) => s.removeSocialCredential(userId, id))),
    );
  };
}

class State {
  constructor(
    private readonly users: HashMap.HashMap<User.Id, User.Identified>,
    private readonly passwords: HashMap.HashMap<User.Id, Credential.EmailPassword.Secure>,
    private readonly socials: HashMap.HashMap<Credential.Social, User.Id>,
    private readonly ids: AutoIncrement<User.User>,
  ) {}

  findById = (id: User.Id): Option.Option<User.Identified> => {
    return HashMap.get(this.users, id);
  };

  findByEmail = (email: S.EmailAddress): Option.Option<User.Identified> => {
    const findSocialCreds = HashMap.findFirst(this.socials, (_, cred) => cred.email === email).pipe(
      Option.map(([, id]) => id),
    );

    return HashMap.findFirst(this.passwords, (cred) => cred.email === email).pipe(
      Option.map(([id]) => id),
      Option.orElse(() => findSocialCreds),
      Option.flatMap((id) => HashMap.get(this.users, id)),
    );
  };

  findPasswordByEmail = (email: S.EmailAddress): Option.Option<Password.Hashed> => {
    return this.findByEmail(email).pipe(
      Option.flatMap((user) => HashMap.get(this.passwords, user.id)),
      Option.map(({ password }) => password),
    );
  };

  findByCredential: (credential: Credential.Secure) => Option.Option<User.Identified> = Credential.matchSecure({
    Secure: (credential) =>
      HashMap.findFirst(this.passwords, ({ email }) => email === credential.email).pipe(
        Option.flatMap(([id]) => this.findById(id)),
      ),
    Social: (credential) =>
      HashMap.findFirst(this.socials, (_, { email }) => email === credential.email).pipe(
        Option.flatMap(([, id]) => this.findById(id)),
      ),
  });

  findEmailCredentialById = (id: User.Id): Option.Option<Credential.EmailPassword.Secure> => {
    return HashMap.get(this.passwords, id);
  };

  findSocialCredentialsById = (id: User.Id): Array<Credential.Social> => {
    return HashMap.filter(this.socials, (userId) => User.eqId(id, userId)).pipe(
      HashMap.keys,
      ReadonlyArray.fromIterable,
    );
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

    const stateFromCredential = Credential.matchSecure({
      Secure: (credential) => {
        const passwords = HashMap.set(this.passwords, id, credential);
        return new State(users, passwords, this.socials, ids);
      },
      Social: (credential) => {
        const socials = HashMap.set(this.socials, credential, id);
        return new State(users, this.passwords, socials, ids);
      },
    });

    return [user, stateFromCredential(input.credentials)];
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
        Option.map(() => new State(users, this.passwords, this.socials, this.ids)),
        Option.getOrElse(() => this),
      ),
    ];
  };

  updateEmail = (id: User.Id, email: S.EmailAddress): [Option.Option<User.Identified>, State] => {
    const users = HashMap.modify(
      this.users,
      id,
      (user) => new Identified({ id: user.id, value: { ...user.value, email } }),
    );

    const passwords = HashMap.modify(
      this.passwords,
      id,
      (credential) => new Credential.EmailPassword.Secure({ email, password: credential.password }),
    );

    const user = HashMap.get(users, id);

    return [
      user,
      user.pipe(
        Option.map(() => new State(users, passwords, this.socials, this.ids)),
        Option.getOrElse(() => this),
      ),
    ];
  };

  setPassword = (id: User.Id, credential: Credential.EmailPassword.Secure): [Option.Option<User.Identified>, State] => {
    const passwords = HashMap.set(this.passwords, id, credential);
    const user = HashMap.get(this.users, id);

    return [
      user,
      user.pipe(
        Option.map(() => new State(this.users, passwords, this.socials, this.ids)),
        Option.getOrElse(() => this),
      ),
    ];
  };

  updatePassword = (id: User.Id, password: Password.Hashed): [Option.Option<User.Identified>, State] => {
    const passwords = HashMap.modify(
      this.passwords,
      id,
      (credential) => new Credential.EmailPassword.Secure({ email: credential.email, password }),
    );

    const user = this.findById(id);

    return [
      user,
      user.pipe(
        Option.map(() => new State(this.users, passwords, this.socials, this.ids)),
        Option.getOrElse(() => this),
      ),
    ];
  };

  removePassword = (id: User.Id): [Option.Option<User.Identified>, State] => {
    const passwords = HashMap.remove(this.passwords, id);
    const user = HashMap.get(this.users, id);

    return [
      user,
      user.pipe(
        Option.map(() => new State(this.users, passwords, this.socials, this.ids)),
        Option.getOrElse(() => this),
      ),
    ];
  };

  addSocialCredential = (id: User.Id, credential: Credential.Social): [Array<Credential.Social>, State] => {
    const socials = HashMap.set(this.socials, credential, id);

    return [
      socials.pipe(HashMap.keys, ReadonlyArray.fromIterable),
      new State(this.users, this.passwords, socials, this.ids),
    ];
  };

  removeSocialCredential = (userId: User.Id, credentialId: Credential.SocialId): [Array<Credential.Social>, State] => {
    const socials = HashMap.findFirst(
      this.socials,
      (id, cred) => cred.id === credentialId && User.eqId(userId, id),
    ).pipe(
      Option.map(([credential]) => HashMap.remove(this.socials, credential)),
      Option.getOrElse(() => this.socials),
    );

    return [
      socials.pipe(HashMap.keys, ReadonlyArray.fromIterable),
      new State(this.users, this.passwords, socials, this.ids),
    ];
  };
}
