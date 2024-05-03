import { Credential, Email, Id, Identified, Identity, Password, Session, Token, User } from "@chuz/domain";
import { Array, Clock, ConfigError, Duration, Effect, Either, HashMap, Option, Ref } from "@chuz/prelude";
import { AutoIncrement } from "core/persistence/AutoIncrement";
import { NoSuchToken } from "../Errors";
import { Passwords } from "../auth/Passwords";
import { ReferenceTokens } from "../tokens/ReferenceTokens";
import * as Errors from "./Errors";
import { Users } from "./Users";

const ONE_DAY = Duration.toMillis("1 days");
const TWO_DAYS = Duration.toMillis("2 days");

export const make: Effect.Effect<Users, ConfigError.ConfigError, Passwords> = Effect.gen(function* () {
  const passwords = yield* Passwords;
  const userTokens = yield* ReferenceTokens.create(Clock.make(), User.eqId);
  const passwordResetTokens = yield* ReferenceTokens.create(Clock.make(), Password.resetEquals);
  const state = yield* Ref.make(new State(HashMap.empty(), HashMap.empty(), AutoIncrement.empty()));

  const isEmailPassword = Credential.Plain.$is(Credential.Tag.EmailPassword);

  const compareCredentials = (
    credential: Credential.Plain,
  ): Effect.Effect<Identified<User.User>, Errors.CredentialNotRecognised> => {
    if (isEmailPassword(credential)) {
      return getByEmail(credential.email).pipe(
        Effect.tap((user) =>
          Ref.get(state).pipe(
            Effect.map((state) => state.findCredentialsById(user.id)),
            Effect.flatMap(Array.findFirst(Credential.Secure.$is(Credential.Tag.EmailPassword))),
            Effect.flatMap((emailCredential) => passwords.validate(credential.password, emailCredential.password)),
          ),
        ),
        Effect.mapError(() => new Errors.CredentialNotRecognised()),
      );
    }

    return Ref.get(state).pipe(
      Effect.flatMap((state) => state.findByCredential(credential)),
      Effect.mapError(() => new Errors.CredentialNotRecognised()),
    );
  };

  const issueToken = (user: Identified<User.User>): Effect.Effect<Session<User.User>> =>
    userTokens
      .issue(user.id, new Token.TimeToLive({ duration: TWO_DAYS }))
      .pipe(Effect.map((token) => new Session({ user, token })));

  const getByEmail = (email: Email): Effect.Effect<Identified<User.User>, Errors.UserNotFound> => {
    return Ref.get(state).pipe(
      Effect.flatMap((s) => s.findByEmail(email)),
      Effect.mapError(() => new Errors.UserNotFound()),
    );
  };

  const register = (
    credential: Credential.Secure,
    user: User.Draft,
  ): Effect.Effect<Session<User.User>, Errors.CredentialAlreadyInUse> => {
    return getByEmail(credential.email).pipe(
      Effect.flatMap(() => new Errors.CredentialAlreadyInUse()),
      Effect.catchTag("UserNotFound", () => Ref.modify(state, (state) => state.register(credential, user))),
      Effect.flatMap(issueToken),
    );
  };

  const identify = (token: Token.Token<Id<User.User>>): Effect.Effect<Session<User.User>, NoSuchToken> => {
    return userTokens.lookup(token).pipe(
      Effect.flatMap(getById),
      Effect.map((user) => new Session({ user, token })),
      Effect.catchTag("UserNotFound", () => new NoSuchToken()),
    );
  };

  const logout = (token: Token.Token<Id<User.User>>): Effect.Effect<void> => userTokens.revoke(token);

  const authenticate = (
    credential: Credential.Plain,
  ): Effect.Effect<Session<User.User>, Errors.CredentialNotRecognised> => {
    return compareCredentials(credential).pipe(Effect.flatMap(issueToken));
  };

  const identities = (id: Id<User.User>): Effect.Effect<User.Identities> => {
    return Ref.get(state).pipe(Effect.map((state) => state.identities(id)));
  };

  const getById = (id: Id<User.User>): Effect.Effect<Identified<User.User>, Errors.UserNotFound> => {
    return Ref.get(state).pipe(
      Effect.flatMap((state) => state.findById(id)),
      Effect.mapError(() => new Errors.UserNotFound()),
    );
  };

  const update = (
    id: Id<User.User>,
    draft: User.Partial,
  ): Effect.Effect<Identified<User.User>, Errors.UserNotFound> => {
    return getById(id).pipe(Effect.tap(() => Ref.modify(state, (s) => s.update(id, draft))));
  };

  const updateEmail = (
    id: Id<User.User>,
    email: Email,
  ): Effect.Effect<Identified<User.User>, Errors.UserNotFound | Errors.EmailAlreadyInUse> => {
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
    token: Token.Token<Id<User.User>>,
    currentPassword: Password.Plaintext,
    updatedPassword: Password.Hashed,
  ): Effect.Effect<void, NoSuchToken | Errors.CredentialNotRecognised> => {
    return userTokens.lookup(token).pipe(
      Effect.flatMap(getById),
      Effect.map((user) => Credential.Plain.EmailPassword({ email: user.value.email, password: currentPassword })),
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
  ): Effect.Effect<Token.Token<[Email, Id<User.User>]>, Errors.CredentialNotRecognised> => {
    return getByEmail(email).pipe(
      Effect.flatMap((user) =>
        passwordResetTokens.issue([email, user.id], new Token.TimeToLive({ duration: ONE_DAY })),
      ),
      Effect.catchTag("UserNotFound", () => new Errors.CredentialNotRecognised()),
    );
  };

  const resetPassword = (
    token: Token.Token<[Email, Id<User.User>]>,
    password: Password.Hashed,
  ): Effect.Effect<Identified<User.User>, NoSuchToken> => {
    return passwordResetTokens.lookup(token).pipe(
      Effect.tap(() => passwordResetTokens.revoke(token)),
      Effect.flatMap(([, id]) => state.modify((s) => s.updatePassword(id, password))),
      Effect.flatMap(Either.fromOption(() => new NoSuchToken())),
      Effect.tap((user) => userTokens.revokeAll(user.id)),
    );
  };

  const linkCredential = (
    token: Token.Token<Id<User.User>>,
    credential: Credential.Secure,
  ): Effect.Effect<User.Identities, NoSuchToken | Errors.CredentialAlreadyInUse> => {
    return Effect.all([userTokens.lookup(token), Ref.get(state)]).pipe(
      Effect.filterOrFail(
        ([_, state]) => Option.isNone(state.findByCredential(credential)),
        () => new Errors.CredentialAlreadyInUse(),
      ),
      Effect.flatMap(([id]) => Ref.modify(state, (s) => s.linkCredential(id, credential))),
    );
  };

  const unlinkCredential = (
    token: Token.Token<Id<User.User>>,
    type: Credential.Tag,
  ): Effect.Effect<User.Identities, NoSuchToken | Errors.NoFallbackCredential | Errors.CredentialNotRecognised> => {
    return Effect.all([userTokens.lookup(token), Ref.get(state)]).pipe(
      Effect.map(([id, state]) => [id, state.identities(id)] as const),
      Effect.filterOrFail(
        ([, identities]) => User.hasFallbackIdentity(identities),
        () => new Errors.NoFallbackCredential(),
      ),
      Effect.flatMap(([userId]) => Ref.modify(state, (s) => s.unlinkCredential(userId, type))),
    );
  };

  return {
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
  };
});

class State {
  constructor(
    private readonly users: HashMap.HashMap<Id<User.User>, Identified<User.User>>,
    private readonly credentials: HashMap.HashMap<Credential.Secure, Id<User.User>>,
    private readonly ids: AutoIncrement<User.User>,
  ) {}

  private toIdentities = (
    id: Id<User.User>,
    credentials: HashMap.HashMap<Credential.Secure, Id<User.User>>,
  ): readonly [User.Identities, State] => {
    const usersCredentials = HashMap.filter(credentials, (userId) => User.eqId(userId, id)).pipe(
      HashMap.map((_, credential) => credential),
    );

    const creds = usersCredentials.pipe(HashMap.values, Array.fromIterable);

    const identities: User.Identities = {
      EmailPassword: Array.findFirst(creds, Credential.Secure.$is(Credential.Tag.EmailPassword)).pipe(
        Option.map(Identity.EmailPassword.fromCredential),
      ),
      Apple: Array.findFirst(creds, Credential.Secure.$is("Apple")).pipe(Option.map(Identity.Apple.fromCredential)),
      Google: Array.findFirst(creds, Credential.Secure.$is("Google")).pipe(Option.map(Identity.Google.fromCredential)),
    };

    return [identities, new State(this.users, credentials, this.ids)] as const;
  };

  findById = (id: Id<User.User>): Option.Option<Identified<User.User>> => {
    return HashMap.get(this.users, id);
  };

  findByEmail = (email: Email): Option.Option<Identified<User.User>> => {
    return HashMap.findFirst(this.users, (user) => user.value.email === email).pipe(Option.map(([_, user]) => user));
  };

  identities = (id: Id<User.User>): User.Identities => {
    const [identities] = this.toIdentities(id, this.credentials);
    return identities;
  };

  findCredentialsById = (id: Id<User.User>): Array<Credential.Secure> => {
    return HashMap.filter(this.credentials, (userId) => User.eqId(userId, id)).pipe(HashMap.keys, Array.fromIterable);
  };

  findByCredential = (credential: Credential.Secure): Option.Option<Identified<User.User>> => {
    return HashMap.get(this.credentials, credential).pipe(Option.flatMap((id) => HashMap.get(this.users, id)));
  };

  register = (credential: Credential.Secure, user: User.Draft): [Identified<User.User>, State] => {
    const [id, ids] = this.ids.next();
    const _user = new Identified({
      id,
      value: User.make({
        email: credential.email,
        firstName: user.firstName,
        lastName: user.lastName,
        optInMarketing: user.optInMarketing,
      }),
    });

    const users = HashMap.set(this.users, id, _user);
    const credentials = HashMap.set(this.credentials, credential, id);

    return [_user, new State(users, credentials, ids)];
  };

  update = (id: Id<User.User>, draft: User.Partial): [Option.Option<Identified<User.User>>, State] => {
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

  updateEmail = (id: Id<User.User>, email: Email): [Option.Option<Identified<User.User>>, State] => {
    const users = HashMap.modify(
      this.users,
      id,
      (user) => new Identified({ id: user.id, value: { ...user.value, email } }),
    );

    const credentials = Array.findFirst(
      this.findCredentialsById(id),
      Credential.Secure.$is(Credential.Tag.EmailPassword),
    ).pipe(
      Option.map((cred) => [HashMap.remove(this.credentials, cred), cred] as const),
      Option.map(([creds, cred]) =>
        HashMap.set(creds, Credential.Secure.EmailPassword({ email, password: cred.password }), id),
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

  updatePassword = (id: Id<User.User>, password: Password.Hashed): [Option.Option<Identified<User.User>>, State] => {
    const credentials = Array.findFirst(
      this.findCredentialsById(id),
      Credential.Secure.$is(Credential.Tag.EmailPassword),
    ).pipe(
      Option.map((cred) => [HashMap.remove(this.credentials, cred), cred] as const),
      Option.map(([creds, cred]) =>
        HashMap.set(creds, Credential.Secure.EmailPassword({ email: cred.email, password }), id),
      ),
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

  linkCredential = (id: Id<User.User>, credential: Credential.Secure): readonly [User.Identities, State] => {
    const credentials = HashMap.set(this.credentials, credential, id);

    return this.toIdentities(id, credentials);
  };

  unlinkCredential = (id: Id<User.User>, type: Credential.Tag): readonly [User.Identities, State] => {
    const credentials = Array.findFirst(this.findCredentialsById(id), Credential.Secure.$is(type)).pipe(
      Option.map((cred) => HashMap.remove(this.credentials, cred)),
      Option.getOrElse(() => this.credentials),
    );

    return this.toIdentities(id, credentials);
  };
}
