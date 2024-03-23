import * as Http from "@effect/platform/HttpServer";
import * as S from "@effect/schema/Schema";
import { SessionStorage, createCookieSessionStorage, createSession } from "@remix-run/node";
import { Context, Effect, Layer, Ref } from "effect";
import { LayerUtils } from "../LayerUtils";
import { EncodedState, RequestState, State } from "./RequestState";

interface Config {
  cookieName: string;
  cookieMaxAgeSeconds: number;
  cookieSecure: boolean;
}

export class CookieRequestState implements Context.Tag.Service<RequestState> {
  static layer = Layer.effect(
    RequestState,
    Effect.gen(function* (_) {
      const config = yield* _(CookieRequestStateConfig);

      const storage = createCookieSessionStorage<EncodedState>({
        cookie: {
          name: config.cookieName,
          secrets: ["test"],
          isSigned: true,
          secure: config.cookieSecure,
          path: "/",
          sameSite: "lax",
          maxAge: config.cookieMaxAgeSeconds,
          httpOnly: true,
        },
      });

      const state = yield* _(
        Http.request.schemaHeaders(S.struct({ cookie: S.string })),
        Effect.andThen(({ cookie }) => storage.getSession(cookie)),
        Effect.flatMap(({ data }) => State.fromUnknown(data)),
        Effect.orElseSucceed(() => State.default),
        Effect.flatMap(Ref.make),
      );

      return new CookieRequestState(state, storage, config.cookieName);
    }),
  );

  constructor(
    private readonly state: Ref.Ref<State>,
    private readonly storage: SessionStorage<EncodedState>,
    private readonly cookieName: string,
  ) {}

  get = <K extends keyof State>(key: K) => Ref.get(this.state).pipe(Effect.map((state) => state[key]));

  set = <K extends keyof State>(key: K, value: State[K]) => Ref.update(this.state, (a) => ({ ...a, [key]: value }));

  commit: Effect.Effect<string> = Effect.suspend(() => Ref.get(this.state)).pipe(
    Effect.flatMap(State.encode),
    Effect.map((state) => createSession(state, this.cookieName)),
    Effect.andThen((session) => this.storage.commitSession(session)),
    Effect.orDie,
  );
}

export class CookieRequestStateConfig extends Context.Tag("@app/CookieRequestStateConfig")<
  CookieRequestStateConfig,
  Config
>() {
  static layer = LayerUtils.config(this);
}
