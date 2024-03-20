import { User } from "@chuz/domain";
import * as Core from "core/index";
import { Effect, Layer } from "effect";
import { SessionStorage } from "./SessionStorage";
import { Users } from "./Users";

export class Sessions extends Effect.Tag("@app/Sessions")<Sessions, Core.Sessions<User>>() {
  static layer = Layer.effect(
    Sessions,
    SessionStorage.get.pipe(
      Effect.flatMap(({ refreshToken, token }) => Users.identify(token, refreshToken)),
      Effect.map((session) => Core.RequestSession.Provided({ session })),
      Effect.mapError(() => Core.RequestSession.NotProvided()),
      Effect.merge,
      Effect.flatMap(Core.UserSessions.make),
    ),
  );
}
