import { Config, Effect, Layer, LogLevel, Logger, Match } from "@chuz/prelude";
import { DevTools } from "@effect/experimental";
import { Passwords, ReferenceUsers } from "core/index";
import { Cookies } from "./prelude";

const IsDebug = Config.boolean("DEBUG").pipe(Config.withDefault(false));

const LogLevelLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const isDebug = yield* IsDebug;
    const level = isDebug ? LogLevel.All : LogLevel.Info;
    return Logger.minimumLogLevel(level);
  }),
);

const Dev = Layer.mergeAll(ReferenceUsers.layer, Cookies.layer, Passwords.layer, LogLevelLive).pipe(
  Layer.provide(DevTools.layer()),
);

const Live = Layer.mergeAll(ReferenceUsers.layer, Cookies.layer, Passwords.layer, LogLevelLive);

const AppMode = Config.literal("live", "dev")("APP_MODE").pipe(Config.withDefault("dev"));

export const AppLayer = Layer.unwrapEffect(
  Effect.map(AppMode, (mode) =>
    Match.value(mode).pipe(
      Match.when("live", () => Live),
      Match.when("dev", () => Dev),
      Match.exhaustive,
    ),
  ),
);
