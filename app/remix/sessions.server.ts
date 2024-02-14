import { SessionStorage, createCookieSessionStorage, Session as RemixSession } from "@remix-run/node";
import { Brand, Effect, Option, Ref } from "effect";
import { createThemeSessionResolver } from "remix-themes";
import { Session, UnauthorisedError } from "~/core";

export type Cookie = string & Brand.Brand<{ readonly Cookie: unique symbol }["Cookie"]>;
export const Cookie = Brand.nominal<Cookie>();

type SessionData<A> = { data: Session<A> };

export class CookieSessions<A> {
  constructor(
    private readonly session: RemixSession<SessionData<A>>,
    private readonly storage: SessionStorage<SessionData<A>>,
    private readonly cookie: Ref.Ref<Option.Option<Cookie>> = Ref.unsafeMake(Option.none<Cookie>()),
  ) {}

  static create = <A>(request: Request, storage: SessionStorage<SessionData<A>>) => {
    return Effect.promise(() => storage.getSession(request.headers.get("Cookie"))).pipe(
      Effect.map((session) => new CookieSessions(session, storage)),
    );
  };

  get = Effect.suspend(() => Effect.fromNullable(this.session.data.data)).pipe(
    Effect.mapError(() => new UnauthorisedError()),
  );

  mint = (a: Session<A>) =>
    Effect.sync(() => this.session.set("data", a)).pipe(
      Effect.andThen(() => this.storage.commitSession(this.session)),
      Effect.map((cookie) => Option.some(Cookie(cookie))),
      Effect.flatMap((cookie) => Ref.set(this.cookie, cookie)),
      Effect.orDie,
    );

  unset = Effect.sync(() => this.session.unset("data")).pipe(
    Effect.andThen(() => this.storage.commitSession(this.session)),
    Effect.map((cookie) => Option.some(Cookie(cookie))),
    Effect.flatMap((cookie) => Ref.set(this.cookie, cookie)),
    Effect.orDie,
  );

  getCookie = Effect.suspend(() => Ref.get(this.cookie));
}

// TODO: Move the `theme` into my Session<A> and delete this storage
export const themeSessionResolver = createThemeSessionResolver(
  createCookieSessionStorage({
    cookie: {
      name: "theme",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secrets: ["s3cr3t"],
      // TODO: Set domain and secure only if in production
      // ...(isProduction ? { domain: "localhost", secure: true } : {}),
    },
  }),
);
