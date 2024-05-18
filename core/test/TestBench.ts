import { Credential, Email, Password, User } from "@chuz/domain";
import { ConfigProvider, Effect, Layer, Option, S } from "@chuz/prelude";
import * as Core from "../src/index";

const config = ConfigProvider.fromJson({
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GOOGLE_REDIRECT_URL: "http://google-redirect-url.com",
  GOOGLE_GET_USER_URL: "http://google-redirect-url.com",
  APP_URL: "http://chuz.test",
});

const TestLayer = Layer.mergeAll(Core.Users.reference, Core.Passwords.layer).pipe(
  Layer.provide(Layer.setConfigProvider(config)),
);

export const TestBench = {
  layer: TestLayer,
  seed: Effect.gen(function* () {
    const users = yield* Core.Users;
    const passwords = yield* Core.Passwords;

    const password = yield* passwords.hash(userRegistration.password);
    const credential = Credential.Secure.EmailPassword({ email: userRegistration.email, password });

    const user: User.Draft = {
      firstName: Option.some(userRegistration.firstName),
      lastName: Option.some(userRegistration.lastName),
      optInMarketing: userRegistration.optInMarketing,
    };

    const session = yield* users.register(credential, user);

    return { session };
  }),
};

const userRegistration = {
  email: S.decodeSync(Email)("lonestar@an.com"),
  password: Password.Strong("password"),
  firstName: User.FirstName("Toby"),
  lastName: User.LastName("Lerone"),
  optInMarketing: User.OptInMarketing(true),
};
