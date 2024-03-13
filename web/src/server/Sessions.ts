import { User } from "@chuz/domain";
import * as Http from "@effect/platform/HttpServer";
import * as S from "@effect/schema/Schema";
import * as Core from "core/index";
import { Effect, Layer } from "effect";
import { Users } from "./App";
import { CookieSessionStorage } from "./CookieSessionStorage";

export class Sessions extends Effect.Tag("@app/Sessions")<Sessions, Core.Sessions<User>>() {
  static layer = Layer.effect(
    Sessions,
    Http.request.schemaHeaders(S.struct({ cookie: S.string })).pipe(
      Effect.flatMap((headers) => CookieSessionStorage.getToken(headers.cookie)),
      Effect.flatMap((token) => Users.identify(token)),
      Effect.map((session) => Core.RequestSession.Provided({ session })),
      Effect.mapError(() => Core.RequestSession.NotProvided()),
      Effect.merge,
      Effect.flatMap(Core.UserSessions.make),
    ),
  );
}
