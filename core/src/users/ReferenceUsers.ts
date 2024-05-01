import { Credential, Email, Identified, OAuth, Password, Session, Token, User } from "@chuz/domain";
import { Array, Clock, Duration, Effect, Either, HashMap, Layer, Match, Option, Predicate, Ref } from "@chuz/prelude";
import { AutoIncrement } from "core/persistence/AutoIncrement";
import { Registration, Users } from "core/users/Users";
import { GenerateUrlFailure, NoSuchToken } from "../Errors";
import { GoogleOAuthProvider } from "../auth/GoogleOAuthProvider";
import { Passwords } from "../auth/Passwords";
import { ReferenceTokens } from "../tokens/ReferenceTokens";
import * as Errors from "./Errors";

const ONE_DAY = Duration.toMillis("1 days");
const TWO_DAYS = Duration.toMillis("2 days");

export const make = Effect.gen(function* () {
  const googleOAuthProvider = yield* GoogleOAuthProvider;
  const passwords = yield* Passwords;
  const userTokens = yield* ReferenceTokens.create(Clock.make(), User.eqId);
  const passwordResetTokens = yield* ReferenceTokens.create(Clock.make(), Password.resetEquals);
  const state = yield* Ref.make(new State(HashMap.empty(), HashMap.empty(), AutoIncrement.empty()));

  const compareCredentials = (
    credential: Credential.Plain,
  ): Effect.Effect<User.Identified, Errors.CredentialNotRecognised> => {
    if (Credential.isPlainEmailPassword(credential)) {
      return getByEmail(credential.email).pipe(
        Effect.flatMap((user) => Effect.map(Ref.get(state), (state) => state.findCredentialsById(user.id))),
        Effect.flatMap(Array.findFirst(Credential.isEmailPassword)),
        Effect.flatMap((emailCredential) => passwords.validate(credential.password, emailCredential.password)),
        Effect.filterOrFail(Predicate.isTruthy, () => new Errors.CredentialNotRecognised()),
        Effect.flatMap(() => getByEmail(credential.email)),
        Effect.mapError(() => new Errors.CredentialNotRecognised()),
      );
    }

    return Ref.get(state).pipe(
      Effect.flatMap((state) => state.findByCredential(credential)),
      Effect.mapError(() => new Errors.CredentialNotRecognised()),
    );
  };

  const issueToken = (user: User.Identified): Effect.Effect<User.Session> =>
    userTokens
      .issue(user.id, new Token.TimeToLive({ duration: TWO_DAYS }))
      .pipe(Effect.map((token) => new Session({ user, token })));

  const getByEmail = (email: Email): Effect.Effect<User.Identified, Errors.UserNotFound> => {
    return Ref.get(state).pipe(
      Effect.flatMap((s) => s.findByEmail(email)),
      Effect.mapError(() => new Errors.UserNotFound()),
    );
  };

  const register = (registration: Registration): Effect.Effect<User.Session, Errors.EmailAlreadyInUse> => {
    return getByEmail(registration.credential.email).pipe(
      Effect.flatMap(() => new Errors.EmailAlreadyInUse({ email: registration.credential.email })),
      Effect.catchTag("UserNotFound", () => Ref.modify(state, (state) => state.register(registration))),
      Effect.flatMap(issueToken),
    );
  };

  const identify = (token: User.Token): Effect.Effect<User.Session, NoSuchToken> => {
    return userTokens.lookup(token).pipe(
      Effect.flatMap(getById),
      Effect.map((user) => new Session({ user, token })),
      Effect.catchTag("UserNotFound", () => new NoSuchToken()),
    );
  };

  const logout = (token: User.Token): Effect.Effect<void> => userTokens.revoke(token);

  const authenticate = (credential: Credential.Plain): Effect.Effect<User.Session, Errors.CredentialNotRecognised> => {
    return compareCredentials(credential).pipe(Effect.flatMap(issueToken));
  };

  const identities = (id: User.Id): Effect.Effect<User.identity.Identities> => {
    return Ref.get(state).pipe(Effect.map((state) => state.identities(id)));
  };

  const getById = (id: User.Id): Effect.Effect<User.Identified, Errors.UserNotFound> => {
    return Ref.get(state).pipe(
      Effect.flatMap((state) => state.findById(id)),
      Effect.mapError(() => new Errors.UserNotFound()),
    );
  };

  const update = (id: User.Id, draft: User.Partial): Effect.Effect<User.Identified, Errors.UserNotFound> => {
    return getById(id).pipe(Effect.tap(() => Ref.modify(state, (s) => s.update(id, draft))));
  };

  const updateEmail = (
    id: User.Id,
    email: Email,
  ): Effect.Effect<User.Identified, Errors.UserNotFound | Errors.EmailAlreadyInUse> => {
    return getByEmail(email).pipe(
      Effect.flatMap(() => new Errors.EmailAlreadyInUse({ email })),
      Effect.catchTag("UserNotFound", () =>
        Ref.modify(state, (state) => state.updateEmail(id, email)).pipe(
          Effect.flatten,
          Effect.mapError(() => new Errors.UserNotFound()),
        ),
      ),
    );
  };

  const updatePassword = (
    token: User.Token,
    currentPassword: Password.Plaintext,
    updatedPassword: Password.Hashed,
  ): Effect.Effect<void, NoSuchToken | Errors.CredentialNotRecognised> => {
    return userTokens.lookup(token).pipe(
      Effect.flatMap(getById),
      Effect.map((user) => Credential.Plain.Email({ email: user.value.email, password: currentPassword })),
      Effect.flatMap(compareCredentials),
      Effect.tap((user) => Ref.modify(state, (s) => s.updatePassword(user.id, updatedPassword))),
      Effect.tap((user) =>
        userTokens.findByValue(user.id).pipe(
          Effect.map((tokens) => tokens.filter((t) => !Token.equals(t, token))),
          Effect.flatMap(userTokens.revokeMany),
        ),
      ),
      Effect.catchTag("UserNotFound", () => new NoSuchToken()),
    );
  };

  const requestPasswordReset = (
    email: Email,
  ): Effect.Effect<Token.Token<[Email, User.Id]>, Errors.CredentialNotRecognised> => {
    return getByEmail(email).pipe(
      Effect.flatMap((user) =>
        passwordResetTokens.issue([email, user.id], new Token.TimeToLive({ duration: ONE_DAY })),
      ),
      Effect.catchTag("UserNotFound", () => new Errors.CredentialNotRecognised()),
    );
  };

  const resetPassword = (
    token: Token.Token<[Email, User.Id]>,
    password: Password.Hashed,
  ): Effect.Effect<User.Identified, NoSuchToken> => {
    return passwordResetTokens.lookup(token).pipe(
      Effect.tap(() => passwordResetTokens.revoke(token)),
      Effect.flatMap(([, id]) => state.modify((s) => s.updatePassword(id, password))),
      Effect.flatMap(Either.fromOption(() => new NoSuchToken())),
      Effect.tap((user) => userTokens.revokeAll(user.id)),
    );
  };

  const linkCredential = (
    token: User.Token,
    credential: Credential.Secure,
  ): Effect.Effect<User.identity.Identities, NoSuchToken | Errors.CredentialAlreadyExists> => {
    return Effect.all([userTokens.lookup(token), Ref.get(state)]).pipe(
      Effect.filterOrFail(
        ([_, state]) => Option.isNone(state.findByCredential(credential)),
        () => new Errors.CredentialAlreadyExists(),
      ),
      Effect.flatMap(([id]) => Ref.modify(state, (s) => s.linkCredential(id, credential))),
    );
  };

  const unlinkCredential = (
    token: User.Token,
    providerId: Credential.ProviderId,
  ): Effect.Effect<
    User.identity.Identities,
    NoSuchToken | Errors.NoFallbackCredential | Errors.CredentialNotRecognised
  > => {
    // TODO: work over credentials, not identities
    return Effect.all([userTokens.lookup(token), Ref.get(state)]).pipe(
      Effect.map(([id, state]) => [id, state.identities(id)] as const),
      Effect.filterOrFail(
        ([, identities]) => {
          return (
            (Credential.eqv(providerId, Credential.ProviderId.Email) && User.identity.hasSocialIdentity(identities)) ||
            (!Credential.eqv(providerId, Credential.ProviderId.Email) && User.identity.hasEmailIdentity(identities))
          );
        },
        () => new Errors.NoFallbackCredential(),
      ),
      Effect.flatMap(([userId]) => Ref.modify(state, (s) => s.unlinkCredential(userId, providerId))),
    );
  };

  const generateAuthUrl = (state: OAuth.State): Effect.Effect<OAuth.ProviderUrl, GenerateUrlFailure> => {
    return Match.value(state.provider).pipe(
      Match.when(OAuth.Provider.google, () => googleOAuthProvider.generateUrl(state)),
      Match.when(OAuth.Provider.apple, () => Effect.die("Apple auth not implemented")),
      Match.exhaustive,
    );
  };

  // TODO: This should:
  // auto link accounts with same email
  // create user if they don't exist
  // authenticate user if found
  const exchangeAuthCodeForSession = (
    code: OAuth.Code,
    _state: OAuth.ValidatedState,
  ): Effect.Effect<User.Session, Errors.EmailAlreadyInUse | Errors.CredentialNotRecognised> => {
    const makeCredential = (user: User.User) =>
      Match.value(_state.provider).pipe(
        Match.when(OAuth.Provider.google, () => Credential.Secure.Google({ email: user.email })),
        Match.when(OAuth.Provider.apple, () => Credential.Secure.Apple({ email: user.email })),
        Match.exhaustive,
      );

    const getUser = Match.value(_state.provider).pipe(
      Match.when(OAuth.Provider.google, () => googleOAuthProvider.getUser(code)),
      Match.when(OAuth.Provider.apple, () => Effect.die("Apple auth not implemented")),
      Match.exhaustive,
    );

    return getUser.pipe(
      Effect.mapError(() => new Errors.CredentialNotRecognised()),
      Effect.flatMap((user) =>
        Ref.get(state).pipe(
          Effect.flatMap((s) => s.findByCredential(makeCredential(user))),
          Effect.orElse(() =>
            getByEmail(user.email).pipe(
              Effect.tap((user) =>
                Ref.get(state).pipe(Effect.map((s) => s.linkCredential(user.id, makeCredential(user.value)))),
              ),
            ),
          ),
          Effect.flatMap(issueToken),
          Effect.orElse(() =>
            register({
              credential: Credential.Secure.Google({ email: user.email }),
              firstName: user.firstName,
              lastName: user.lastName,
              optInMarketing: user.optInMarketing,
            }),
          ),
        ),
      ),
    );
  };

  return Users.of({
    authenticate,
    getByEmail,
    getById,
    identities,
    identify,
    linkCredential,
    logout,
    register,
    requestPasswordReset,
    resetPassword,
    unlinkCredential,
    update,
    updateEmail,
    updatePassword,
    exchangeAuthCodeForSession,
    generateAuthUrl,
  });
});

export const layer = Layer.effect(Users, make).pipe(
  Layer.provide(Passwords.layer),
  Layer.provide(GoogleOAuthProvider.layer),
);

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
        email: input.credential.email,
        firstName: input.firstName,
        lastName: input.lastName,
        optInMarketing: input.optInMarketing,
      }),
    });

    const users = HashMap.set(this.users, id, user);
    const credentials = HashMap.set(this.credentials, input.credential, id);

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
