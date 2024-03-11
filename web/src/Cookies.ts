import { RequestSession } from "@chuz/core";
import { UserSession } from "@chuz/domain";
import _cookie, { CookieSerializeOptions } from "cookie";
import { Brand, Duration, Effect, Option, ReadonlyRecord } from "effect";

export type Cookie = string & Brand.Brand<"Cookie">;

const SESSION_COOKIE = "_session";
const SESSION_COOKIE_DURATION = Duration.weeks(2);

export namespace Cookie {
  const Cookie = Brand.nominal<Cookie>();

  export const serialize = <A extends string>(
    key: string,
    value: A,
    options: CookieSerializeOptions,
  ): Effect.Effect<Cookie> => Effect.sync(() => _cookie.serialize(key, value, options)).pipe(Effect.map(Cookie));

  export const parse = (header: string): Effect.Effect<Record<string, Cookie>> =>
    Effect.sync(() => _cookie.parse(header)).pipe(Effect.map(ReadonlyRecord.map(Cookie)));

  export const fromRequestSession: (requestSession: RequestSession) => Effect.Effect<Option.Option<Cookie>> =
    RequestSession.makeMatcher({
      InvalidToken: () => Effect.option(serialize(SESSION_COOKIE, "", { maxAge: -1, path: "/" })),
      NotProvided: () => Effect.fail("").pipe(Effect.option),
      Provided: () => Effect.fail("").pipe(Effect.option),
      Set: ({ session }) =>
        Effect.option(
          serialize(SESSION_COOKIE, UserSession.toString(session), {
            maxAge: Duration.toSeconds(SESSION_COOKIE_DURATION),
            path: "/",
          }),
        ),
      Unset: () => Effect.option(serialize(SESSION_COOKIE, "", { maxAge: -1, path: "/" })),
    });
}
