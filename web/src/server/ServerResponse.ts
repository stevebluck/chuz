import { Effect } from "@chuz/prelude";
import * as Http from "@effect/platform/HttpServer";
import { Cookies } from "./Cookies";

export const unauthorized = Http.response.empty({ status: 401 });

export const serverError = Http.response.empty({ status: 500 });

export const notFound = Http.response.empty({ status: 404 });

export const badRequest = <E>(error: E) => Http.response.json(error, { status: 400 });

export const json = <A>(data: A) => Http.response.json(data, { status: 200 });

export const redirect = (location: string) =>
  Http.response.empty({ status: 302, headers: Http.headers.fromInput({ location }) });

export const returnTo = (fallback: string) =>
  Effect.gen(function* () {
    const returnTo = yield* Cookies.returnTo;

    return yield* returnTo.read.pipe(
      Effect.flatMap((url) => redirect(url)),
      Effect.flatMap((res) => returnTo.remove(res)),
      Effect.orElse(() => redirect(fallback)),
    );
  });
