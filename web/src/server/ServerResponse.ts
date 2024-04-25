import { Effect, PR, Predicate, Array, Record } from "@chuz/prelude";
import { ArrayFormatter } from "@chuz/prelude/src/Schema";
import * as Http from "@effect/platform/HttpServer";
import { Routes } from "src/Routes";
import { InvalidFormData } from "./ServerRequest";
import { Cookie } from "./cookies/Cookie";
import * as Cookies from "./cookies/Cookies";

export const empty = (options?: Http.response.Options.WithContent) => Http.response.empty(options);

export const unauthorized: Effect.Effect<
  Http.response.ServerResponse,
  never,
  Cookies.ReturnTo | Http.request.ServerRequest
> = Effect.gen(function* (_) {
  const returnToCookie = yield* _(Cookies.ReturnTo);
  const request = yield* _(Http.request.ServerRequest);
  const url = new URL(request.url);

  return yield* _(redirect(Routes.login), Effect.flatMap(setCookie(returnToCookie, url.pathname)));
});

export const redirectToAccount: Effect.Effect<
  Http.response.ServerResponse,
  never,
  Cookies.ReturnTo | Http.request.ServerRequest
> = Cookies.ReturnTo.pipe(
  Effect.flatMap((returnToCookie) => returnToCookie.read),
  Effect.flatMap((url) => redirect(url)),
  Effect.catchTags({ CookieNotPresent: () => redirect(Routes.dashboard) }),
);

export const serverError: Effect.Effect<Http.response.ServerResponse> = Http.response.empty({ status: 500 });

export const notFound: Effect.Effect<Http.response.ServerResponse> = Http.response.empty({ status: 404 });

export const ok = (data?: unknown): Effect.Effect<Http.response.ServerResponse> =>
  Predicate.isUndefined(data)
    ? Http.response.empty({ status: 200 }).pipe(Effect.orDie)
    : Http.response.json(data).pipe(Effect.orDie);

export const setCookie =
  <A>(cookie: Cookie<A>, value: A) =>
  (res: Http.response.ServerResponse): Effect.Effect<Http.response.ServerResponse> =>
    cookie.encode(value).pipe(
      Effect.flatMap((value) => Http.response.setCookie(cookie.name, value, cookie.options)(res)),
      Effect.tapError((e) => Effect.logError("Unable to set cookie", e)),
      Effect.catchTags({ CookieError: () => Effect.succeed(res) }),
    );

export const redirect = (location: string): Effect.Effect<Http.response.ServerResponse> =>
  Http.response.empty({ status: 302, headers: Http.headers.fromInput({ location }) });

export const badRequest = <E extends { _tag: string }>(
  error: E | InvalidFormData,
): Effect.Effect<Http.response.ServerResponse> => {
  if (isParseError(error)) {
    return Http.response
      .json({ _tag: "FormError", error: Record.map(formatParseError(error.error), (a) => a[0]) }, { status: 400 })
      .pipe(Effect.orDie);
  }

  return Http.response.json(error, { status: 400 }).pipe(Effect.orDie);
};

const isParseError = <E extends { _tag: string }>(error: E | InvalidFormData): error is InvalidFormData =>
  error._tag === "InvalidFormData";

const formatParseError = (error: PR.ParseError): Record<string, string[]> => {
  return Record.map(
    Array.groupBy(ArrayFormatter.formatErrorSync(error), (i) => i.path.join(".")),
    Array.map((a) => a.message),
  );
};
