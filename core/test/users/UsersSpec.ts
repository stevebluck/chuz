import { describe, expect } from "vitest";
import { Credentials, Email, Password, Token, User } from "@chuz/domain";
import { Effect, Either, FC } from "@chuz/prelude";
import { Emails } from "../../src/emails/Emails";
import { Arbs } from "../Arbs";
import { property, Property } from "../Property";
import { TestBench } from "../TestBench";

export namespace UsersSpec {
  export const run = (withBench: TestBench.WithSeed, config: Property.Config) => {
    property(
      "users can register with unique emails (case insensitive)",
      Arbs.Users.Registration.EmailPassword,
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
      Arbs.Users.Registration.EmailPassword,
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
      Arbs.Users.Registration.EmailPassword,
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
      Arbs.Users.Registration.EmailPassword,
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

    property(
      "users can authenticate with OAuth credentials",
      Arbs.Users.Registration.Google,
      (register) =>
        withBench(({ users }) =>
          Effect.gen(function* () {
            const session0 = yield* users.register(register);

            const authed0 = yield* users.authenticate(register.credentials);

            const badCredentials0 = Credentials.OAuth.Google({ email: Email.unsafeFrom("bad-email@example.com") });

            const credentialsNotRecognised0 = yield* users.authenticate(badCredentials0).pipe(Effect.either);

            expect(credentialsNotRecognised0).toEqual(Either.left(new Credentials.NotRecognised()));
            expect(authed0.user).toEqual(session0.user);
          }),
        ),
      config,
    );

    property(
      "users can be found by id or email (case insensitive)",
      Arbs.Users.Registration.EmailPassword,
      (register) =>
        withBench(({ users, registerUser }) =>
          Effect.gen(function* () {
            const session = yield* registerUser(register);

            const foundUserById = yield* users.findById(session.user.id);
            const foundUserByEmail = yield* users.findByEmail(register.credentials.email);
            const foundUserByEmail1 = yield* users.findByEmail(Emails.toLowerCase(register.credentials.email));
            const foundUserByEmail2 = yield* users.findByEmail(Emails.toUpperCase(register.credentials.email));

            expect(foundUserById).toEqual(session.user);
            expect(foundUserByEmail).toEqual(session.user);
            expect(foundUserByEmail1).toEqual(session.user);
            expect(foundUserByEmail2).toEqual(session.user);
          }),
        ),
      config,
    );

    describe("Update", () => {
      property(
        "users can update their first name / last name, and opt-in marketing status",
        FC.tuple(Arbs.Users.Registration.EmailPassword, Arbs.Users.Patch),
        ([register, patch]) =>
          withBench(({ users, registerUser }) =>
            Effect.gen(function* () {
              const session = yield* registerUser(register);

              const foundById0 = yield* users.findById(session.user.id);

              yield* users.update(session.user.id, patch);

              const foundById1 = yield* users.findById(session.user.id);

              expect(foundById0).toEqual(session.user);
              expect(foundById1.value).toMatchObject(patch);
            }),
          ),
        config,
      );

      property(
        "users can update their email to a unique email",
        FC.tuple(Arbs.Users.Registration.EmailPassword, Arbs.Emails.Email),
        ([register, email]) =>
          withBench(({ users, registerUser, makePlainCredentials }) =>
            Effect.gen(function* () {
              yield* registerUser(register);
              const plain = makePlainCredentials(register.credentials);

              const newEmail = Email.unsafeFrom(`new-${email}`);

              const session0 = yield* users.authenticate(plain.credentials);
              const updated = yield* users.updateEmail(session0.user.id, newEmail);
              const credentialsNotRecognised = yield* users.authenticate(plain.credentials).pipe(Effect.either);
              const session2 = yield* users.authenticate(Credentials.EmailPassword.Plain({ email: newEmail, password: plain.credentials.password }));

              expect(credentialsNotRecognised).toEqual(Either.left(new Credentials.NotRecognised()));
              expect(updated.value.email).toEqual(newEmail);
              expect(session2.user.value).toEqual(updated.value);
              expect(session2.user.id).toEqual(session0.user.id);
            }),
          ),
        config,
      );

      property(
        "users cannot update their email if they do not have an email/password credential",
        FC.tuple(Arbs.Users.Registration.Google, Arbs.Emails.Email),
        ([register, email]) =>
          withBench(({ users }) =>
            Effect.gen(function* () {
              yield* users.register(register);
              const session0 = yield* users.authenticate(register.credentials);

              const credentialNotRecognised = yield* users.updateEmail(session0.user.id, email).pipe(Effect.either);

              expect(credentialNotRecognised).toEqual(Either.left(new Credentials.NotRecognised()));
            }),
          ),
        config,
      );

      property(
        "users cannot update their email to an exisitng email (case insensitive)",
        FC.tuple(Arbs.Users.Registration.EmailPassword, Arbs.Users.Registration.EmailPassword),
        ([register0, register1]) =>
          withBench(({ users, registerUser }) =>
            Effect.gen(function* () {
              const session0 = yield* registerUser(register0);
              const session1 = yield* registerUser(register1);

              const lowercase = Emails.toLowerCase(session0.user.value.email);
              const uppercase = Emails.toUpperCase(session0.user.value.email);

              const error0 = yield* users.updateEmail(session1.user.id, session0.user.value.email).pipe(Effect.either);
              const error1 = yield* users.updateEmail(session1.user.id, lowercase).pipe(Effect.either);
              const error2 = yield* users.updateEmail(session1.user.id, uppercase).pipe(Effect.either);

              expect(error0).toEqual(Either.left(new Credentials.AlreadyInUse()));
              expect(error1).toEqual(Either.left(new Credentials.AlreadyInUse()));
              expect(error2).toEqual(Either.left(new Credentials.AlreadyInUse()));
            }),
          ),
        config,
      );

      describe("Password", () => {
        property(
          "users can update their password",
          FC.tuple(Arbs.Users.Registration.EmailPassword, Arbs.Password.Strong),
          ([register, newPassword]) =>
            withBench(({ users, registerUser, makePlainCredentials, hash }) =>
              Effect.gen(function* () {
                const session = yield* registerUser(register);

                const plain = makePlainCredentials(register.credentials);
                const hashedNewPassword = yield* hash(newPassword);

                const authed = yield* users.authenticate(plain.credentials);

                yield* users.updatePassword(session.token, plain.credentials.password, hashedNewPassword);

                const credentialsNotRecognised = yield* users.authenticate(plain.credentials).pipe(Effect.either);

                const authed2 = yield* users.authenticate(
                  Credentials.EmailPassword.Plain({
                    email: register.credentials.email,
                    password: Password.Plaintext.unsafeFrom(newPassword),
                  }),
                );

                expect(authed.user).toEqual(session.user);
                expect(authed2.user).toEqual(session.user);
                expect(credentialsNotRecognised).toEqual(Either.left(new Credentials.NotRecognised()));
              }),
            ),
          config,
        );

        property(
          "users cannot update their password with an expired session or invalid current password",
          FC.tuple(Arbs.Users.Registration.EmailPassword, Arbs.Password.Strong),
          ([register, newPassword]) =>
            withBench(({ users, registerUser, makePlainCredentials, hash }) =>
              Effect.gen(function* () {
                const session = yield* registerUser(register);
                const plain = makePlainCredentials(register.credentials);
                const hashedNewPassword = yield* hash(newPassword);

                const error0 = yield* users.updatePassword(session.token, Password.Plaintext.unsafeFrom("bad-password"), hashedNewPassword).pipe(Effect.either);

                yield* users.logout(session.token);

                const error1 = yield* users.updatePassword(session.token, plain.credentials.password, hashedNewPassword).pipe(Effect.either);

                expect(error0).toEqual(Either.left(new Credentials.NotRecognised()));
                expect(error1).toEqual(Either.left(new User.NotFound()));
              }),
            ),
          config,
        );

        property(
          "existing sessions expire when password is updated excluding the current session",
          FC.tuple(Arbs.Users.Registration.EmailPassword, Arbs.Password.Strong),
          ([register, newPassword]) =>
            withBench(({ users, registerUser, makePlainCredentials, hash }) =>
              Effect.gen(function* () {
                const session0 = yield* registerUser(register);
                const plain = makePlainCredentials(register.credentials);
                const hashedNewPassword = yield* hash(newPassword);

                const session1 = yield* users.authenticate(plain.credentials);

                yield* users.updatePassword(session1.token, plain.credentials.password, hashedNewPassword);

                const error = yield* users.identify(session0.token).pipe(Effect.either);
                const session2 = yield* users.identify(session1.token);

                expect(error).toEqual(Either.left(new Token.NoSuchToken()));
                expect(session1.user).toEqual(session0.user);
                expect(session2.user).toEqual(session1.user);
              }),
            ),
          config,
        );
      });

      describe("Password Reset", () => {
        property(
          "users can reset their password",
          FC.tuple(Arbs.Users.Registration.EmailPassword, Arbs.Password.Strong),
          ([register, newPassword]) =>
            withBench(({ users, registerUser, makePlainCredentials, hash }) =>
              Effect.gen(function* () {
                const session0 = yield* registerUser(register);
                const plain = makePlainCredentials(register.credentials);
                const hashedNewPassword = yield* hash(newPassword);

                const token = yield* users.requestPasswordReset(register.credentials.email);
                yield* users.resetPassword(token, hashedNewPassword);

                const error = yield* users.authenticate(plain.credentials).pipe(Effect.either);
                const session1 = yield* users.authenticate(
                  Credentials.EmailPassword.Plain({
                    email: plain.credentials.email,
                    password: Password.Plaintext.unsafeFrom(newPassword),
                  }),
                );

                expect(error).toEqual(Either.left(new Credentials.NotRecognised()));
                expect(session1.user).toEqual(session0.user);
              }),
            ),
          config,
        );

        property(
          "existing sessions expire when password is reset",
          FC.tuple(Arbs.Users.Registration.EmailPassword, Arbs.Password.Strong),
          ([register, newPassword]) =>
            withBench(({ users, registerUser, makePlainCredentials, hash }) =>
              Effect.gen(function* () {
                const session0 = yield* registerUser(register);
                const plain = makePlainCredentials(register.credentials);
                const hashedNewPassword = yield* hash(newPassword);

                const session1 = yield* users.authenticate(plain.credentials);

                const token = yield* users.requestPasswordReset(register.credentials.email);
                yield* users.resetPassword(token, hashedNewPassword);

                const error0 = yield* users.identify(session0.token).pipe(Effect.either);
                const error1 = yield* users.identify(session1.token).pipe(Effect.either);

                expect(error0).toEqual(Either.left(new Token.NoSuchToken()));
                expect(error1).toEqual(Either.left(new Token.NoSuchToken()));
              }),
            ),
          config,
        );

        property(
          "password reset tokens are single-use",
          FC.tuple(Arbs.Users.Registration.EmailPassword, Arbs.Password.Strong),
          ([register, newPassword]) =>
            withBench(({ users, registerUser, hash }) =>
              Effect.gen(function* () {
                yield* registerUser(register);
                const hashedNewPassword = yield* hash(newPassword);

                const token = yield* users.requestPasswordReset(register.credentials.email);

                yield* users.resetPassword(token, hashedNewPassword);
                const error = yield* users.resetPassword(token, hashedNewPassword).pipe(Effect.either);

                expect(error).toEqual(Either.left(new Token.NoSuchToken()));
              }),
            ),
          config,
        );

        property(
          "password reset request fails for unknown email address",
          Arbs.Emails.Email,
          (email) =>
            withBench(({ users }) =>
              Effect.gen(function* () {
                const error = yield* users.requestPasswordReset(email).pipe(Effect.either);
                expect(error).toEqual(Either.left(new Credentials.NotRecognised()));
              }),
            ),
          config,
        );
      });
    });
  };
}
