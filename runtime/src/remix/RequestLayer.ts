import { RequestSession, Sessions, Unauthorised } from "@chuz/core";
import { User, UserSession } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { Effect, Option, Ref } from "effect";
import { Requests } from "../Requests";

export type RequestContext = Sessions<User> | Requests;

export const RemixRequests = (request: Request) =>
  Requests.of({
    parseInput: (schema) =>
      Effect.promise(() => request.formData()).pipe(
        Effect.map(Object.fromEntries),
        Effect.flatMap(S.decodeUnknown(schema)),
        Effect.withSpan("parseInput"),
      ),
  });

export const RemixSessions = (request: Request) =>
  UserSession.fromString(request.headers.get("cookie") ?? "").pipe(
    Effect.option,
    Effect.map(
      Option.match({
        onNone: () => RequestSession.NotProvided(),
        onSome: (session) => RequestSession.Provided({ session }),
      }),
    ),
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
          ).pipe(Effect.withSpan("Sessions.set")),
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
  );
