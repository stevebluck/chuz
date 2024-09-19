import { expect } from "vitest";
import { Credentials, Email, Password, Token, User } from "@chuz/domain";
import { Effect, Either } from "@chuz/prelude";
import { Emails } from "../../src/emails/Emails";
import { Arbs } from "../Arbs";
import { property, Property } from "../Property";
import { TestBench } from "../TestBench";

export namespace UsersSpec {
  export const run = (withBench: TestBench.WithSeed, config: Property.Config) => {
    property(
      "users can register with unique emails (case insensitive)",
      Arbs.Users.Registration,
      (register) =>
        withBench(({ users, registerUser }) =>
          Effect.gen(function* () {
            const registerUserWithEmail = (email: Email) => registerUser({ ...register, credentials: { ...register.credentials, email } });

            const notFoundError = yield* users.findByEmail(register.credentials.email).pipe(Effect.either);
            const session = yield* registerUserWithEmail(register.credentials.email);
            const user = yield* users.findByEmail(register.credentials.email);

            const uppercase = Emails.toUpperCase(register.credentials.email);
            const lowercase = Emails.toLowerCase(register.credentials.email);

            const error0 = yield* registerUserWithEmail(register.credentials.email).pipe(Effect.either);
            const error1 = yield* registerUserWithEmail(lowercase).pipe(Effect.either);
            const error2 = yield* registerUserWithEmail(uppercase).pipe(Effect.either);

            expect(session.user.value).toEqual(user.value);
            expect(notFoundError).toEqual(Either.left(new User.NotFound()));
            expect(error0).toEqual(Either.left(new Credentials.AlreadyInUse()));
            expect(error1).toEqual(Either.left(new Credentials.AlreadyInUse()));
            expect(error2).toEqual(Either.left(new Credentials.AlreadyInUse()));
          }),
        ),
      config,
    );

    property(
      "users can be identified by a session",
      Arbs.Users.Registration,
      (register) =>
        withBench(({ users, registerUser }) =>
          Effect.gen(function* () {
            const session = yield* registerUser(register);
            const identified = yield* users.identify(session.token);

            expect(identified).toEqual(session);
          }),
        ),
      config,
    );

    property(
      "users can logout of a session",
      Arbs.Users.Registration,
      (register) =>
        withBench(({ users, registerUser }) =>
          Effect.gen(function* () {
            const session = yield* registerUser(register);
            yield* users.logout(session.token);
            const noSuchToken = yield* users.identify(session.token).pipe(Effect.either);

            expect(noSuchToken).toEqual(Either.left(new Token.NoSuchToken()));
          }),
        ),
      config,
    );

    property(
      "users can authenticate many sessions with their credentials (case insensitive)",
      Arbs.Users.Registration,
      (register) =>
        withBench(({ users, registerUser, makePlainCredentials }) =>
          Effect.gen(function* () {
            const session = yield* registerUser(register);
            const plain = makePlainCredentials(register.credentials);

            const authed0 = yield* users.authenticate(plain.credentials);
            const authed1 = yield* users.authenticate(plain.lowercase);
            const authed2 = yield* users.authenticate(plain.uppercase);

            const badCredentials = Credentials.EmailPassword.Plain({
              email: plain.credentials.email,
              password: Password.Plaintext.unsafeFrom(`bad-${plain.credentials.password}`),
            });

            const credentialsNotRecognised = yield* users.authenticate(badCredentials).pipe(Effect.either);

            expect(credentialsNotRecognised).toEqual(Either.left(new Credentials.NotRecognised()));
            expect(authed0.user).toEqual(session.user);
            expect(authed1.user).toEqual(session.user);
            expect(authed2.user).toEqual(session.user);
          }),
        ),
      config,
    );
  };
}
