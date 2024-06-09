import { ConfigProvider, Effect, Layer, LogLevel, Logger } from "@chuz/prelude";
import { Passwords, Users } from "../../src";
import { ReferenceCleanUp } from "../CleanUp";
import { Seeds } from "../Seed";
import { UsersSpec } from "./UsersSpec";

const config = ConfigProvider.fromJson({
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GOOGLE_REDIRECT_URL: "http://google-redirect-url.com",
  GOOGLE_GET_USER_URL: "http://google-redirect-url.com",
  APP_URL: "http://chuz.test",
});

const TestLayer = Layer.succeed(
  UsersSpec.TestLayer,
  Seeds.layer.pipe(
    Layer.provide(ReferenceCleanUp),
    Layer.provideMerge(Users.reference),
    Layer.provideMerge(Passwords.layer),
    Layer.provide(Layer.setConfigProvider(config)),
    Layer.provide(Logger.minimumLogLevel(LogLevel.None)),
    Layer.orDie,
  ),
);

const suite = Effect.provide(UsersSpec.Suite, TestLayer);

Effect.runFork(suite);
