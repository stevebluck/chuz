import { SessionStorage, createCookieSessionStorage } from "@remix-run/node";
import { Effect } from "effect";
import { Capabilities, Credentials, Email, Password, Passwords, Reference, Session, User, tokenEq } from "~/core";

export class Runtime {
  constructor(
    public readonly capabilites: Capabilities,
    public readonly storage: SessionStorage<{ data: Session<User> }>,
  ) {}

  static dev = Effect.gen(function* (_) {
    const clock = Reference.Clock.make();
    const hasher = Passwords.hasher(4);
    const sessionTokens = yield* _(Reference.Tokens.create(clock, tokenEq));
    const passwordResetTokens = yield* _(Reference.PasswordReset(clock));
    const users = yield* _(Reference.Users.create(sessionTokens, passwordResetTokens));

    const password = yield* _(hasher(Password.Strong.unsafeFrom("password")));
    const credentials = new Credentials.Secure({ email: Email.unsafeFrom("stephenbluck@msn.com"), password });

    yield* _(
      users.register(
        credentials,
        User.FirstName.unsafeFrom("Stephen"),
        User.LastName.unsafeFrom("Bluck"),
        User.OptInMarketing.unsafeFrom(false),
      ),
    );

    const decks = yield* _(Reference.Decks.create(users));
    const storage = createCookieSessionStorage<{ data: Session<User> }>({
      cookie: {
        name: "__session",
        secrets: ["r3m1xr0ck5"],
        sameSite: "lax",
      },
    });

    return new Runtime(Capabilities.make(hasher, users, decks, clock), storage);
  });
}
