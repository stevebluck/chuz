import { Credential, Identified, Password, Session, Token, User } from "@chuz/domain";
import { ProviderId } from "@chuz/domain/src/Credential";
import { Duration, Effect, Either, HashMap, Option, Predicate, Ref, S, identity } from "@chuz/prelude";
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
          Effect.flatMap((state) => state.findEmailCredential(credential.email)),
          Effect.flatMap((emailCredential) => this.match(credential.password, emailCredential.password)),
          Effect.filterOrFail(Predicate.isTruthy, () => new Credential.NotRecognised()),
          Effect.flatMap(() => this.getByEmail(credential.email)),
          Effect.mapError(() => new Credential.NotRecognised()),
        ),
      AuthProvider: (credential) =>
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
    return Ref.get(this.state).pipe(Effect.map((state) => state.identities(id)));
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
    return Effect.all([this.userTokens.lookup(token), Ref.get(this.state)]).pipe(
      Effect.filterOrFail(
        ([userId, state]) => Option.isSome(state.findCredentialByProvider(userId, providerId)),
        () => new Credential.NotRecognised(),
      ),
      Effect.map(([id, state]) => [id, state.identities(id)] as const),
      Effect.filterOrFail(
        ([, identities]) => {
          return (
            (Credential.isEmailProvider(providerId) && User.identity.hasSocialIdentity(identities)) ||
            (Credential.isAuthProviderId(providerId) && User.identity.hasEmailIdentity(identities))
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
    private readonly passwords: HashMap.HashMap<User.Id, Credential.EmailPassword.Secure>,
    private readonly socials: HashMap.HashMap<Credential.AuthProvider, User.Id>,
    private readonly ids: AutoIncrement<User.User>,
  ) {}

  private toIdentities = (
    id: User.Id,
    passwords: HashMap.HashMap<User.Id, Credential.EmailPassword.Secure>,
    socials: HashMap.HashMap<Credential.AuthProvider, User.Id>,
  ): readonly [User.identity.Identities, State] => {
    const _passwords = HashMap.get(passwords, id);
    const _socials = HashMap.filter(socials, (userId) => User.eqId(userId, id)).pipe(
      HashMap.map((_, credential) => credential),
    );

    const users = HashMap.modifyAt(
      this.users,
      id,
      Option.flatMap((user) =>
        _passwords.pipe(
          Option.map(
            ({ email }) =>
              new Identified({
                id: user.id,
                value: { ...user.value, email },
              }),
          ),
        ),
      ),
    );

    return [
      {
        [ProviderId.email]: Option.map(HashMap.get(passwords, id), User.identity.fromCredential),
        [ProviderId.google]: HashMap.findFirst(_socials, Credential.isGoogle).pipe(
          Option.map(([credential]) => User.identity.fromCredential(credential)),
        ),
        [ProviderId.apple]: HashMap.findFirst(_socials, Credential.isApple).pipe(
          Option.map(([credential]) => User.identity.fromCredential(credential)),
        ),
      },
      new State(users, passwords, socials, this.ids),
    ] as const;
  };

  findById = (id: User.Id): Option.Option<User.Identified> => {
    return HashMap.get(this.users, id);
  };

  findByEmail = (email: S.EmailAddress): Option.Option<User.Identified> => {
    return HashMap.findFirst(this.users, (user) => user.value.email === email).pipe(Option.map(([_, user]) => user));
  };

  identities = (id: User.Id): User.identity.Identities => {
    const socialCredentials = HashMap.filter(this.socials, (userId) => User.eqId(userId, id)).pipe(
      HashMap.map((_, credential) => credential),
    );

    return {
      [ProviderId.email]: Option.map(HashMap.get(this.passwords, id), User.identity.fromCredential),
      [ProviderId.google]: HashMap.findFirst(socialCredentials, Credential.isGoogle).pipe(
        Option.map(([credential]) => User.identity.fromCredential(credential)),
      ),
      [ProviderId.apple]: HashMap.findFirst(socialCredentials, Credential.isApple).pipe(
        Option.map(([credential]) => User.identity.fromCredential(credential)),
      ),
    };
  };

  findEmailCredential = (email: S.EmailAddress): Option.Option<Credential.EmailPassword.Secure> => {
    return HashMap.findFirst(this.passwords, (credential) => credential.email === email).pipe(
      Option.map(([, credential]) => credential),
    );
  };

  findByCredential: (credential: Credential.Secure) => Option.Option<User.Identified> = Credential.matchSecure({
    Secure: (credential) =>
      HashMap.findFirst(this.passwords, ({ email }) => email === credential.email).pipe(
        Option.flatMap(([id]) => this.findById(id)),
      ),
    AuthProvider: (credential) =>
      HashMap.findFirst(this.socials, (_, { email }) => email === credential.email).pipe(
        Option.flatMap(([, id]) => this.findById(id)),
      ),
  });

  findCredentialByProvider = (id: User.Id, providerId: Credential.ProviderId): Option.Option<Credential.Secure> => {
    if (providerId === ProviderId.email) {
      return HashMap.get(this.passwords, id);
    }

    return this.socials.pipe(
      HashMap.findFirst((userId, credential) => User.eqId(userId, id) && credential.providerId === providerId),
      Option.map(([credential]) => credential),
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
      AuthProvider: (credential) => {
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
      (credential) =>
        new Credential.EmailPassword.Secure({
          email,
          password: credential.password,
          providerId: ProviderId.email,
        }),
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

  updatePassword = (id: User.Id, password: Password.Hashed): [Option.Option<User.Identified>, State] => {
    const passwords = HashMap.modify(
      this.passwords,
      id,
      (credential) =>
        new Credential.EmailPassword.Secure({
          email: credential.email,
          password,
          providerId: ProviderId.email,
        }),
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

  linkCredential = (id: User.Id, credential: Credential.Secure): readonly [User.identity.Identities, State] =>
    Credential.matchSecure({
      Secure: (credential) => {
        const passwords = HashMap.set(this.passwords, id, credential);
        return this.toIdentities(id, passwords, this.socials);
      },
      AuthProvider: (credential) => {
        const socials = HashMap.set(this.socials, credential, id);
        return this.toIdentities(id, this.passwords, socials);
      },
    })(credential);

  unlinkCredential = (id: User.Id, providerId: Credential.ProviderId): readonly [User.identity.Identities, State] => {
    if (providerId === ProviderId.email) {
      const passwords = HashMap.remove(this.passwords, id);
      return this.toIdentities(id, passwords, this.socials);
    }

    const socials = this.socials.pipe(
      HashMap.findFirst((userId, credential) => credential.providerId === providerId && User.eqId(userId, id)),
      Option.map(([credential]) => HashMap.remove(this.socials, credential)),
      Option.getOrElse(() => this.socials),
    );

    return this.toIdentities(id, this.passwords, socials);
  };
}
