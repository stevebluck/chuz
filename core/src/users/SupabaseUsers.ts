import { User, Session, Email, Id, Identified, Token, Credentials, Password } from "@chuz/domain";
import { PostgrestMaybeSingleResponse, SupabaseClient, Session as SbSession } from "@supabase/supabase-js";
import { Cache, Console, Duration, Effect, Exit, Option } from "effect";
import { Database } from "../schema.gen";
import { Users } from "./Users";

interface Config {
  emailRedirectTo: string;
}

const TEN_MINUTES = Duration.toSeconds(Duration.minutes(10));

export class SupabaseUsers implements Users {
  constructor(
    private readonly config: Config,
    private readonly auth: SupabaseClient["auth"],
    private readonly repo: UsersRepo,
    private readonly cache: Cache.Cache<string, Token.NoSuchToken, SbSession>,
  ) {}

  static make = (config: Config, client: SupabaseClient): Effect.Effect<Users> =>
    Effect.gen(function* (_) {
      const cache = yield* _(
        Cache.makeWith<string, never, Token.NoSuchToken, SbSession>({
          capacity: 1000,
          timeToLive: Exit.match({
            onSuccess: ({ expires_in }) => Duration.seconds(expires_in - TEN_MINUTES),
            onFailure: () => "1 second",
          }),
          lookup: (token) =>
            Effect.promise(() => client.auth.refreshSession({ refresh_token: token })).pipe(
              Effect.flatMap((res) => Option.fromNullable(res.data.session)),
              Effect.catchAll(() => new Token.NoSuchToken()),
              Effect.tapBoth({
                onFailure: (err) => Console.error("Silent login failed", err),
                onSuccess: () => Console.log("Silent login successful"),
              }),
            ),
        }),
      );
      const repo = new SupabaseUsersRepo(client);
      return new SupabaseUsers(config, client.auth, repo, cache);
    });

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
          emailRedirectTo: this.config.emailRedirectTo,
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
      Effect.tap(({ session }) => this.cache.set(session.refresh_token, session)),
      Effect.map(({ user, session }) => new Session({ token: Token.make<Id<User>>(session.refresh_token), user })),
      Effect.catchTags({
        NoSuchElementException: () => new Email.AlreadyInUse({ email }),
        UserNotFound: () => Effect.die("User not found"),
      }),
      Effect.withSpan("SupabaseUsers.register"),
    );
  };

  findById = (id: Id<User>): Effect.Effect<Identified<User>, User.NotFound> => {
    return this.repo.getUserById(id);
  };

  findByEmail = (email: Email): Effect.Effect<Identified<User>, User.NotFound> => {
    return this.repo.getUserByEmail(email);
  };

  identify = (token: Token<Id<User>>): Effect.Effect<Session<User>, Token.NoSuchToken> => {
    return this.cache.get(token.value).pipe(
      Effect.andThen((session) => this.auth.getUser(session.access_token)),
      Effect.flatMap((res) => Effect.fromNullable(res.data.user)),
      Effect.flatMap((user) => this.repo.getUserById(Id<User>(user.id))),
      Effect.map((user) => new Session({ token, user })),
      Effect.catchAll(() => new Token.NoSuchToken()),
      Effect.withSpan("SupabaseUsers.identify"),
    );
  };

  authenticate = (credentials: Credentials.Plain): Effect.Effect<Session<User>, Credentials.NotRecognised> => {
    return Effect.promise(() =>
      this.auth.signInWithPassword({ email: credentials.email, password: credentials.password }),
    ).pipe(
      Effect.bind("session", (res) => Effect.fromNullable(res.data.session)),
      Effect.bind("user", ({ session }) => this.repo.getUserById(Id<User>(session.user.id))),
      Effect.tap(({ session }) => this.cache.set(session.refresh_token, session)),
      Effect.map(({ user, session }) => new Session({ token: Token.make<Id<User>>(session.refresh_token), user })),
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
      Effect.tap(({ session }) => this.cache.set(session.refresh_token, session)),
      Effect.map(({ user, session }) => new Session({ token: Token.make<Id<User>>(session.refresh_token), user })),
      Effect.catchTags({
        NoSuchElementException: (error) => new Credentials.InvalidCode({ error }),
        UserNotFound: () => Effect.die("User not found"),
      }),
    );
  };

  logout = (token: Token<Id<User>>): Effect.Effect<void> => {
    return this.cache.get(token.value).pipe(
      Effect.andThen(({ access_token }) => this.auth.admin.signOut(access_token, "local")),
      Effect.tap(() => this.cache.invalidate(token.value)),
      Effect.catchTag("NoSuchToken", () => Effect.unit),
      Effect.catchTag("UnknownException", (err) => Effect.die(err)),
      Effect.withSpan("SupabaseUsers.logout"),
    );
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
    updatedPasword: Password.Hashed,
  ): Effect.Effect<void, User.NotFound | Credentials.NotRecognised> {
    throw new Error("Method not implemented.");
  }

  requestPasswordReset(email: Email): Effect.Effect<Token<[Email, Id<User>]>, Credentials.NotRecognised> {
    throw new Error("Method not implemented.");
  }

  resetPassword(
    token: Token<[Email, Id<User>]>,
    password: Password.Hashed,
  ): Effect.Effect<Identified<User>, Token.NoSuchToken> {
    throw new Error("Method not implemented.");
  }
}

interface UsersRepo {
  getUserById: (id: Id<User>) => Effect.Effect<Identified<User>, User.NotFound>;
  getUserByEmail: (email: Email) => Effect.Effect<Identified<User>, User.NotFound>;
}

export class SupabaseUsersRepo implements UsersRepo {
  constructor(private readonly client: SupabaseClient<Database, "public">) {}

  private handleError = ({
    error,
    data,
  }: PostgrestMaybeSingleResponse<DbUser>): Effect.Effect<DbUser, User.NotFound> => {
    return error ? Effect.die(error) : Option.fromNullable(data).pipe(Effect.mapError(() => new User.NotFound()));
  };

  private fromDbUser = (user: DbUser): Effect.Effect<Identified<User>> => {
    return User.parse({
      email: user.email || "",
      firstName: user.first_name,
      lastName: user.last_name,
      optInMarketing: user.opt_in_marketing || false,
    }).pipe(
      Effect.map((u) => new Identified<User>({ id: Id(user.id), value: u })),
      Effect.orDie,
    );
  };

  getUserById = (id: Id<User>): Effect.Effect<Identified<User>, User.NotFound> => {
    return Effect.promise(() => this.client.from("users").select("*").eq("id", id.value).maybeSingle()).pipe(
      Effect.flatMap(this.handleError),
      Effect.flatMap(this.fromDbUser),
      Effect.withSpan("SupabaseUsersRepo.getUserById"),
    );
  };

  getUserByEmail = (email: Email): Effect.Effect<Identified<User>, User.NotFound> => {
    return Effect.promise(() => this.client.from("users").select("*").eq("email", email).maybeSingle()).pipe(
      Effect.flatMap(this.handleError),
      Effect.flatMap(this.fromDbUser),
      Effect.withSpan("SupabaseUsersRepo.getUserByEmail"),
    );
  };
}

type DbUser = Database["public"]["Tables"]["users"]["Row"];
