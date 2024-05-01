import { Effect } from "@chuz/prelude";
import * as Http from "@effect/platform/HttpServer";
import { Cookies } from "./prelude";

export * from "@effect/platform/Http/ServerResponse";

export const unauthorized = Http.response.empty({ status: 401 });

export const serverError = Http.response.empty({ status: 500 });

export const notFound = Http.response.empty({ status: 404 });

export const badRequest = <E>(error: E) => Http.response.json(error, { status: 400 });

export const ok = <A>(data: A) => Http.response.json(data, { status: 200 });

export const redirect = (location: string) =>
  Http.response.empty({ status: 302, headers: Http.headers.fromInput({ location }) });

export const returnTo = (fallback: string) =>
  Cookies.ReturnTo.pipe(
    Effect.flatMap((cookie) => cookie.read.pipe(Effect.flatMap(redirect), Effect.flatMap(cookie.remove))),
    Effect.catchTags({ CookieNotPresent: () => redirect(fallback) }),
  );
