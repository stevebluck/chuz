import { schemaHeaders, ServerRequest } from "@effect/platform/Http/ServerRequest";
import * as S from "@effect/schema/Schema";
import { CookieOptions, createCookie, Cookie as RemixCookie } from "@remix-run/node";
import { Data, Effect, identity, Option } from "effect";

interface Cookies<A> {
  parse: Effect.Effect<A, CookieNotPresent, ServerRequest>;
  serialise: (value: Option.Option<A>) => Effect.Effect<string>;
}

export class Cookie<A> implements Cookies<A> {
  cookie: RemixCookie;

  constructor(
    private readonly name: string,
    private readonly schema: S.Schema<A, string>,
    private readonly config: CookieOptions,
  ) {
    this.cookie = createCookie(this.name, {
      secrets: ["test"],
      secure: this.config.secure,
      path: "/",
      sameSite: "lax",
      maxAge: this.config.maxAge,
      httpOnly: true,
      decode: identity,
      encode: identity,
    });
  }

  serialise = (opt: Option.Option<A>) =>
    Option.match(opt, {
      onNone: () => Effect.promise(() => this.cookie.serialize("", { maxAge: 1 })),
      onSome: (value) =>
        Effect.succeed(value).pipe(
          Effect.flatMap(S.encode(this.schema)),
          Effect.andThen((string) => this.cookie.serialize(string)),
          Effect.orDie,
        ),
    });

  parse = Effect.suspend(() =>
    schemaHeaders(S.struct({ cookie: S.string })).pipe(
      Effect.map(({ cookie }) => cookie),
      Effect.andThen((str) => this.cookie.parse(str)),
      Effect.flatMap(S.decode(this.schema)),
      Effect.mapError(() => new CookieNotPresent()),
    ),
  );
}

class CookieNotPresent extends Data.TaggedError("CookieNotPresent") {}
