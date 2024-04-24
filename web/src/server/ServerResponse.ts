import { Effect, PR, Predicate, Array, Record } from "@chuz/prelude";
import { ArrayFormatter } from "@chuz/prelude/src/Schema";
import * as Http from "@effect/platform/HttpServer";
import { Routes } from "src/Routes";
import { InvalidFormData } from "./ServerRequest";
import { AppCookies } from "./cookies/AppCookies";

type ServerResponseEffect = Effect.Effect<
  Http.response.ServerResponse,
  Http.body.BodyError,
  AppCookies | Http.request.ServerRequest
>;

export const empty = (options?: Http.response.Options.WithContent) => Http.response.empty(options);

export const unauthorized: ServerResponseEffect = Effect.gen(function* (_) {
  const request = yield* _(Http.request.ServerRequest);
  const returnToCookie = yield* _(AppCookies.returnTo);
  const url = new URL(request.url);

  return yield* _(
    redirect(Routes.login),
    Effect.flatMap(returnToCookie.save(url.pathname)),
    Effect.catchTags({ CookieError: () => redirect(Routes.login) }),
  );
});

export const redirectToAccount = AppCookies.returnTo.pipe(
  Effect.flatMap((returnToCookie) => returnToCookie.read),
  Effect.flatMap((url) => redirect(url)),
  Effect.catchTags({ CookieNotPresent: () => redirect(Routes.dashboard) }),
);

export const serverError = Http.response.empty({ status: 500 });

export const notFound = Http.response.empty({ status: 404 });

export const ok = (data?: unknown) =>
  Predicate.isUndefined(data) ? Http.response.empty({ status: 200 }) : Http.response.json(data);

export const redirect = (location: string): ServerResponseEffect =>
  Http.response.empty({ status: 302, headers: Http.headers.fromInput({ location }) });

export const validationError = ({ error }: InvalidFormData): ServerResponseEffect =>
  Http.response.json({ _tag: "FormError", error: Record.map(formatParseError(error), (a) => a[0]) }, { status: 400 });

export const badRequest = <E extends { _tag: string }>(error: E): ServerResponseEffect =>
  Http.response.json(error, { status: 400 });

const formatParseError = (error: PR.ParseError): Record<string, string[]> => {
  return Record.map(
    Array.groupBy(ArrayFormatter.formatErrorSync(error), (i) => i.path.join(".")),
    Array.map((a) => a.message),
  );
};
