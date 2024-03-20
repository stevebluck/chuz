import { User, Session, Email, Id, Identified, Token, Credentials, Password } from "@chuz/domain";
import { ParseError } from "@effect/schema/ParseResult";
import { SupabaseClient, Session as SbSession } from "@supabase/supabase-js";
import { Cache, Console, Data, Duration, Effect, Exit, Option } from "effect";
import { DB, Database } from "..";
import { Users } from "./Users";

interface Config {
  callbackUrl: string;
}

const TEN_MINUTES = Duration.toSeconds(Duration.minutes(10));

type CacheKey = {
  _tag: "CacheKey";
  token: string;
  refreshToken: string;
};

namespace CacheKey {
  export const fromSbSession = (session: SbSession): CacheKey =>
    Data.case<CacheKey>()({
      _tag: "CacheKey",
      token: session.access_token,
      refreshToken: session.refresh_token,
    });

  export const make = (token: Token<Id<User>>, refreshToken: Token<string>) =>
    Data.tagged<CacheKey>("CacheKey")({ token: token.value, refreshToken: refreshToken.value });
}

export class SupabaseUsers implements Users {
  constructor(
    private readonly config: Config,
    private readonly auth: SupabaseClient["auth"],
    private readonly repo: UsersRepo,
    private readonly cache: Cache.Cache<CacheKey, Token.NoSuchToken, SbSession>,
  ) {}

  static make = (config: Config, auth: SupabaseClient["auth"], db: Database): Effect.Effect<Users> =>
    Effect.gen(function* (_) {
      const cache = yield* _(
        Cache.makeWith<CacheKey, never, Token.NoSuchToken, SbSession>({
          capacity: 1000,
          timeToLive: Exit.match({
            onSuccess: ({ expires_in }) => Duration.seconds(expires_in - TEN_MINUTES),
            onFailure: () => "1 second",
          }),
          lookup: ({ refreshToken, token }) => {
            return Effect.promise(() => auth.setSession({ access_token: token, refresh_token: refreshToken })).pipe(
              Effect.flatMap((res) => Option.fromNullable(res.data.session)),
              Effect.catchAll(() => new Token.NoSuchToken()),
              Effect.tapBoth({
                onFailure: (err) => Console.error("Silent login failed", err),
                onSuccess: () => Console.log("Silent login successful"),
              }),
              Effect.withSpan("SupabaseUsers.setSession"),
            );
          },
        }),
      );
      const repo = new SupabaseUsersRepo(db);
      return new SupabaseUsers(config, auth, repo, cache);
    });

  // TODO: write a test to deal with refresh tokens
  identify = (token: Token<Id<User>>, refreshToken: Token<string>): Effect.Effect<Session<User>, Token.NoSuchToken> => {
    return Effect.Do.pipe(
      Effect.bind("session", () => this.cache.get(CacheKey.make(token, refreshToken))),
      Effect.bind("user", ({ session }) => this.repo.getUserById(Id<User>(session.user.id))),
      Effect.map(({ session, user }) => toSession(user, session)),
      Effect.catchAll(() => new Token.NoSuchToken()),
      Effect.withSpan("SupabaseUsers.identify"),
    );
  };

  register = ({
    credentials: { email, password },
    firstName,
    lastName,
    optInMarketing,
  }: User.Registration): Effect.Effect<Session<User>, Email.AlreadyInUse> => {
    return Effect.promise(() =>
      this.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: this.config.callbackUrl,
          data: {
            first_name: Option.getOrNull(firstName),
            last_name: Option.getOrNull(lastName),
            opt_in_marketing: optInMarketing,
          },
        },
      }),
    ).pipe(
      Effect.bind("session", (res) => Effect.fromNullable(res.data.session)),
      Effect.bind("user", ({ session }) => this.repo.getUserById(Id<User>(session.user.id))),
      Effect.tap(({ session }) => this.cache.set(CacheKey.fromSbSession(session), session)),
      Effect.map(({ user, session }) => toSession(user, session)),
      Effect.catchTags({
        NoSuchElementException: () => new Email.AlreadyInUse({ email }),
        UserNotFound: () => Effect.die("User not found"),
      }),
      Effect.withSpan("SupabaseUsers.register"),
    );
  };

  // TODO: make Credential a sum type and take care of OAuth providers
  authenticate = (credentials: Credentials.Plain): Effect.Effect<Session<User>, Credentials.NotRecognised> => {
    return Effect.promise(() =>
      this.auth.signInWithPassword({ email: credentials.email, password: credentials.password }),
    ).pipe(
      Effect.bind("session", (res) => Effect.fromNullable(res.data.session)),
      Effect.bind("user", ({ session }) => this.repo.getUserById(Id<User>(session.user.id))),
      Effect.tap(({ session }) => this.cache.set(CacheKey.fromSbSession(session), session)),
      Effect.map(({ user, session }) => toSession(user, session)),
      Effect.catchTags({
        NoSuchElementException: () => new Credentials.NotRecognised(),
        UserNotFound: () => Effect.die("User not found"),
      }),
      Effect.withSpan("SupabaseUsers.authenticate"),
    );
  };

  authenticateByCode = (code: Credentials.Code): Effect.Effect<Session<User>, Credentials.InvalidCode> => {
    return Effect.promise(() => this.auth.exchangeCodeForSession(code)).pipe(
      Effect.bind("session", (res) => Effect.fromNullable(res.data.session)),
      Effect.bind("user", ({ session }) => this.repo.getUserById(Id<User>(session.user.id))),
      Effect.tap(({ session }) => this.cache.set(CacheKey.fromSbSession(session), session)),
      Effect.map(({ user, session }) => toSession(user, session)),
      Effect.catchTags({
        NoSuchElementException: (error) => new Credentials.InvalidCode({ error }),
        UserNotFound: () => Effect.die("User not found"),
      }),
      Effect.withSpan("SupabaseUsers.authenticateByCode"),
    );
  };

  logout = (token: Token<Id<User>>): Effect.Effect<void> => {
    // TODO: invalidate cache?
    return Effect.promise(() => this.auth.admin.signOut(token.value, "local")).pipe(
      Effect.asUnit,
      Effect.withSpan("SupabaseUsers.logout"),
    );
  };

  findById = (id: Id<User>): Effect.Effect<Identified<User>, User.NotFound> => {
    return this.repo.getUserById(id);
  };

  findByEmail = (email: Email): Effect.Effect<Identified<User>, User.NotFound> => {
    return this.repo.getUserByEmail(email);
  };

  update(id: Id<User>, partial: User.Partial): Effect.Effect<Identified<User>, User.NotFound> {
    throw new Error("Method not implemented.");
  }

  updateEmail(id: Id<User>, email: Email): Effect.Effect<Identified<User>, User.UpdateEmailError> {
    throw new Error("Method not implemented.");
  }

  updatePassword(
    token: Token<Id<User>>,
    currentPassword: Password.Plaintext,
    updatedPasword: Password.Strong,
  ): Effect.Effect<void, User.NotFound | Credentials.NotRecognised> {
    throw new Error("Method not implemented.");
  }

  requestPasswordReset(email: Email): Effect.Effect<Token<[Email, Id<User>]>, Credentials.NotRecognised> {
    throw new Error("Method not implemented.");
  }

  resetPassword(
    token: Token<[Email, Id<User>]>,
    password: Password.Strong,
  ): Effect.Effect<Identified<User>, Token.NoSuchToken> {
    throw new Error("Method not implemented.");
  }
}

interface UsersRepo {
  getUserById: (id: Id<User>) => Effect.Effect<Identified<User>, User.NotFound>;
  getUserByEmail: (email: Email) => Effect.Effect<Identified<User>, User.NotFound>;
}

export class SupabaseUsersRepo implements UsersRepo {
  constructor(private readonly db: Database) {}

  getUserById = (id: Id<User>): Effect.Effect<Identified<User>, User.NotFound> => {
    return Effect.promise(() =>
      this.db.selectFrom("users").where("id", "=", id.value).selectAll().executeTakeFirst(),
    ).pipe(
      Effect.flatMap(Effect.fromNullable),
      Effect.flatMap(toUser),
      Effect.catchTags({
        ParseError: Effect.die,
        NoSuchElementException: () => new User.NotFound(),
      }),
      Effect.withSpan("SupabaseUsersRepo.getUserById"),
    );
  };

  getUserByEmail = (email: Email): Effect.Effect<Identified<User>, User.NotFound> => {
    return Effect.promise(() =>
      this.db.selectFrom("users").where("id", "=", email).selectAll().executeTakeFirst(),
    ).pipe(
      Effect.flatMap(Effect.fromNullable),
      Effect.flatMap(toUser),
      Effect.catchTags({
        ParseError: Effect.die,
        NoSuchElementException: () => new User.NotFound(),
      }),
      Effect.withSpan("SupabaseUsersRepo.getUserByEmail"),
    );
  };
}

const toSession = (user: Identified<User>, session: SbSession) =>
  new Session({
    token: Token.make<Id<User>>(session.access_token),
    refreshToken: Token.make<string>(session.refresh_token),
    user,
  });

const toUser = (user: DB["users"]): Effect.Effect<Identified<User>, ParseError> =>
  User.from({
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    optInMarketing: user.opt_in_marketing || false,
  }).pipe(Effect.map((u) => new Identified<User>({ id: Id(user.id), value: u })));
