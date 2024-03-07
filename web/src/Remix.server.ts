import { Remix } from "@chuz/app";
import { Capabilities, RequestSession, Sessions, Unauthorised } from "@chuz/core";
import { User, UserSession } from "@chuz/domain";
import { DevTools } from "@effect/experimental";
import * as cookie from "cookie";
import { Duration, Effect, Layer, Metric, Option, Ref } from "effect";

export const RemixServer = Remix.make({
  runtimeLayer: Capabilities.Test.layer.pipe(Layer.merge(DevTools.layer())),
  requestLayer: ({ request }) => makeRemixSessions(request.headers.get("cookie") ?? ""),
  route:
    ({ request }) =>
    (self) => {
      const url = new URL(request.url);
      const headers = new Headers();

      const route = makeRequestSession(request.headers.get("cookie") ?? "").pipe(
        Effect.andThen(self),
        Effect.tapBoth({
          onFailure: () => setSession(headers),
          onSuccess: () => setSession(headers),
        }),
        Effect.mapBoth({
          onSuccess: Remix.Result({ headers }),
          onFailure: Remix.Result({ headers }),
        }),
        Effect.withSpan(`${request.method} ${url.pathname}`, {
          attributes: {
            url: request.url,
            method: request.method,
          },
        }),
        Effect.tapDefect((cause) => Effect.logError("Unknown defect", cause)),
        Metric.counter(url.pathname).pipe(Metric.withConstantInput(1)),
      );

      return route;
    },
});

const makeRequestSession = (str: string) =>
  UserSession.fromString(str).pipe(
    Effect.match({
      onFailure: () => RequestSession.NotProvided(),
      onSuccess: (session) => RequestSession.Provided({ session }),
    }),
    Effect.flatMap((requestSession) => Ref.make<RequestSession>(requestSession)),
  );

const setSession = (headers: Headers) =>
  Sessions.pipe(
    Effect.flatMap((sessions) => sessions.get),
    Effect.map(
      RequestSession.makeMatcher({
        InvalidToken: () => headers.set("Set-Cookie", cookie.serialize("session", "", { maxAge: -1, path: "/" })),
        NotProvided: () => {},
        Provided: () => {},
        Set: ({ session }) =>
          headers.set(
            "Set-Cookie",
            cookie.serialize("session", UserSession.toString(session), {
              maxAge: Duration.toSeconds(Duration.weeks(2)),
              path: "/",
            }),
          ),
        Unset: () => headers.set("Set-Cookie", cookie.serialize("session", "", { maxAge: -1, path: "/" })),
      }),
    ),
  );

const makeRemixSessions = (str: string): Layer.Layer<Sessions<User>> =>
  Layer.effect(
    Sessions,
    UserSession.fromString(str).pipe(
      Effect.match({
        onFailure: () => RequestSession.NotProvided(),
        onSuccess: (session) => RequestSession.Provided({ session }),
      }),
      Effect.flatMap((requestSession) => Ref.make<RequestSession>(requestSession)),
      Effect.map((ref) =>
        Sessions.of({
          get: Ref.get(ref).pipe(Effect.withSpan("Sessions.get")),
          invalidate: Ref.set(ref, RequestSession.Unset()).pipe(Effect.withSpan("Sessions.invalidate")),
          set: (session) =>
            Ref.set(
              ref,
              Option.match(session, {
                onNone: () => RequestSession.Unset(),
                onSome: (session) => RequestSession.Set({ session }),
              }),
            ).pipe(Effect.withSpan("essions.set")),
          mint: (session) => Ref.set(ref, RequestSession.Set({ session })).pipe(Effect.withSpan("Sessions.mint")),
          authenticated: Ref.get(ref).pipe(
            Effect.flatMap(
              RequestSession.makeMatcher({
                NotProvided: () => Option.none(),
                Provided: ({ session }) => Option.some(session),
                Set: ({ session }) => Option.some(session),
                InvalidToken: () => Option.none(),
                Unset: () => Option.none(),
              }),
            ),
            Effect.mapError(() => new Unauthorised()),
            Effect.withSpan("Sessions.authenticated"),
          ),
          guest: Ref.get(ref).pipe(
            Effect.flatMap(
              RequestSession.makeMatcher({
                NotProvided: () => Option.some({}),
                Provided: () => Option.none(),
                Set: () => Option.none(),
                InvalidToken: () => Option.some({}),
                Unset: () => Option.some({}),
              }),
            ),
            Effect.mapError(() => new Unauthorised()),
            Effect.withSpan("Sessions.guest"),
          ),
        }),
      ),
    ),
  );
