import { Data, Effect } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Cookie as HttpCookie } from "@effect/platform/Http/Cookies";
import * as Http from "@effect/platform/HttpServer";
import { createHmac, timingSafeEqual } from "crypto";

export class Cookie<A> {
  constructor(
    private readonly name: string,
    private readonly schema: S.Schema<A, string>,
    public readonly options: HttpCookie["options"] & { secret: string },
  ) {}

  private sign = (val: string) => {
    return Effect.sync(() => val + "." + createHmac("sha256", this.options.secret).update(val).digest("base64"));
  };

  private unsign = (input: string) =>
    Effect.gen(this, function* (_) {
      const tentativeValue = input.slice(0, input.lastIndexOf(".")),
        expectedInput = yield* _(this.sign(tentativeValue)),
        expectedBuffer = Buffer.from(expectedInput),
        inputBuffer = Buffer.from(input);

      return yield* _(
        expectedBuffer.length === inputBuffer.length && timingSafeEqual(expectedBuffer, inputBuffer)
          ? Effect.succeed(tentativeValue)
          : Effect.fail(new UnsignError()),
      );
    });

  remove = (res: Http.response.ServerResponse) =>
    this.read.pipe(
      Effect.flatMap(() => Http.response.unsafeSetCookie(this.name, "", { ...this.options, maxAge: 0 })(res)),
      Effect.orElseSucceed(() => res),
    );

  save = (value: A) => (res: Http.response.ServerResponse) =>
    Effect.succeed(value).pipe(
      Effect.flatMap(S.encode(this.schema)),
      Effect.flatMap(this.sign),
      Effect.flatMap((str) => Http.response.setCookie(this.name, str, this.options)(res)),
      Effect.catchTag("ParseError", (e) => Effect.die(e)),
    );

  read = Effect.suspend(() =>
    Http.request.ServerRequest.pipe(
      Effect.map((req) => req.cookies),
      Effect.flatMap((cookies) => Effect.fromNullable(cookies[this.name])),
      Effect.flatMap((a) => this.unsign(a)),
      Effect.flatMap(S.decode(this.schema)),
      Effect.mapError(() => new CookieNotPresent()),
    ),
  );
}

class CookieNotPresent extends Data.TaggedError("CookieNotPresent") {}

class UnsignError extends Data.TaggedError("UnsignError") {}
