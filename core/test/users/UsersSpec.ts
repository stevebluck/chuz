import { Credential, Email, Password, User } from "@chuz/domain";
import { Effect, Option, fc } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { NoSuchToken } from "core/Errors";
import { Passwords, Users } from "core/index";
import * as Errors from "core/users/Errors";
import { afterAll, describe, expect } from "vitest";
import { Arbs } from "../Arbs";
import { asyncProperty } from "../Property";
import { SpecConfig, defaultSpecConfig } from "../SpecConfig";
import { TestBench } from "../TestBench";

export namespace UsersSpec {
  export const run = <E>(TestBench: Effect.Effect<TestBench.Seeded, E>, config: SpecConfig = defaultSpecConfig) => {
    afterAll(config.afterAll);

    describe("Users.register", () => {
      asyncProperty(
        "users can register with unique emails (case insensitive)",
        Arbs.Registration.EmailPassword,
        (register) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const registerUserWithEmail = (email: Email) =>
              registerUser(users, { ...register, credential: { ...register.credential, email } });

            const session = yield* registerUserWithEmail(register.credential.email);

            expect(session.user.value).toStrictEqual(
              User.make({
                firstName: register.firstName,
                lastName: register.lastName,
                email: register.credential.email,
                optInMarketing: register.optInMarketing,
              }),
            );

            const uppercase = makeEmail(register.credential.email.toUpperCase());
            const lowercase = makeEmail(register.credential.email.toLocaleLowerCase());

            const error0 = yield* Effect.flip(registerUserWithEmail(register.credential.email));
            const error1 = yield* Effect.flip(registerUserWithEmail(lowercase));
            const error2 = yield* Effect.flip(registerUserWithEmail(uppercase));

            expect(error0).toStrictEqual(new Errors.EmailAlreadyInUse({ email: register.credential.email }));
            expect(error1).toStrictEqual(new Errors.EmailAlreadyInUse({ email: lowercase }));
            expect(error2).toStrictEqual(new Errors.EmailAlreadyInUse({ email: uppercase }));
          }),
        config,
      );

      asyncProperty("users can register with a third party provider", Arbs.Registration.Google, (registration) =>
        Effect.gen(function* () {
          const { users } = yield* TestBench;

          const session = yield* users.register(registration);

          const user = yield* users.getByEmail(registration.credential.email);

          expect(user).toStrictEqual(session.user);
        }),
      );
    });

    describe("Users.identify", () => {
      asyncProperty(
        "users can be identifed by a session",
        Arbs.Registration.EmailPassword,
        (registration) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const session = yield* registerUser(users, registration);
            const identified = yield* users.identify(session.token);
            expect(identified.user).toStrictEqual(session.user);
          }),
        config,
      );
    });

    describe("Users.logout", () => {
      asyncProperty(
        "users can log out of a session",
        Arbs.Registration.EmailPassword,
        (registration) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const session = yield* registerUser(users, registration);
            yield* users.logout(session.token);
            const noSuchTokenError = yield* Effect.flip(users.identify(session.token));
            expect(noSuchTokenError).toStrictEqual(new NoSuchToken());
          }),
        config,
      );
    });

    describe("Users.authenticate", () => {
      asyncProperty(
        "users can authenticate many sessions with their email credential (case insensitive)",
        Arbs.Registration.EmailPassword,
        (registration) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const session = yield* registerUser(users, registration);
            const plain = makePlainCredentials(registration.credential);

            const authed = yield* users.authenticate(plain.credentials);

            const authed1 = yield* users.authenticate(plain.lowercase);
            const authed2 = yield* users.authenticate(plain.uppercase);
            const badCredentials = Credential.Plain.Email({
              email: plain.credentials.email,
              password: Password.Plaintext(`bad-${plain.credentials.password}`),
            });
            const credentialsNotRecognisedError = yield* Effect.flip(users.authenticate(badCredentials));

            expect(authed.user).toStrictEqual(session.user);
            expect(authed1.user).toStrictEqual(session.user);
            expect(authed2.user).toStrictEqual(session.user);
            expect(credentialsNotRecognisedError).toStrictEqual(new Errors.CredentialNotRecognised());
          }),
        config,
      );

      asyncProperty(
        "users can authenticate with a third party provider credential",
        Arbs.Registration.Google,
        (registration) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;

            yield* users.register(registration);

            const session = yield* users.authenticate(registration.credential);
            const user = yield* users.getByEmail(registration.credential.email);

            expect(session.user).toStrictEqual(user);
          }),
      );
    });

    describe("Users.getBy*", () => {
      asyncProperty(
        "users can be found by id or email (case insensitive)",
        Arbs.Registration.EmailPassword,
        (registration) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const session = yield* registerUser(users, registration);
            const foundUserById = yield* users.getById(session.user.id);
            const foundUserByEmail = yield* users.getByEmail(registration.credential.email);

            const foundUserByEmail1 = yield* users.getByEmail(
              makeEmail(registration.credential.email.toLocaleLowerCase()),
            );

            const foundUserByEmail2 = yield* users.getByEmail(makeEmail(registration.credential.email.toUpperCase()));

            expect(foundUserById).toStrictEqual(session.user);
            expect(foundUserByEmail).toStrictEqual(session.user);
            expect(foundUserByEmail1).toStrictEqual(session.user);
            expect(foundUserByEmail2).toStrictEqual(session.user);
          }),
        config,
      );
    });

    describe("Users.updateEmail", () => {
      asyncProperty(
        "users can update their email to a unique email",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Email),
        ([registration, newEmail]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const session = yield* registerUser(users, registration);
            const plain = makePlainCredentials(registration.credential);

            const authed = yield* users.authenticate(plain.credentials);
            expect(authed.user).toStrictEqual(session.user);

            const updated = yield* users.updateEmail(session.user.id, newEmail);

            expect(updated.value.email).toStrictEqual(newEmail);

            const credentialsNotRecognisedError = yield* Effect.flip(users.authenticate(plain.credentials));
            expect(credentialsNotRecognisedError).toStrictEqual(new Errors.CredentialNotRecognised());

            const authed2 = yield* users.authenticate(
              Credential.Plain.Email({ email: newEmail, password: plain.credentials.password }),
            );
            expect(authed2.user.id).toStrictEqual(session.user.id);
          }),
        config,
      );

      asyncProperty(
        "users cannot update their email to an exisitng email (case insensitive)",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Registration.EmailPassword),
        ([register1, register2]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const user1 = yield* registerUser(users, register1);

            const user2 = yield* registerUser(users, register2);

            const lowercase = makeEmail(user1.user.value.email.toLocaleLowerCase());
            const uppercase = makeEmail(user1.user.value.email.toUpperCase());

            const error0 = yield* Effect.flip(users.updateEmail(user2.user.id, user1.user.value.email));
            const error1 = yield* Effect.flip(users.updateEmail(user2.user.id, lowercase));
            const error2 = yield* Effect.flip(users.updateEmail(user2.user.id, uppercase));

            expect(error0).toStrictEqual(new Errors.EmailAlreadyInUse({ email: user1.user.value.email }));
            expect(error1).toStrictEqual(new Errors.EmailAlreadyInUse({ email: lowercase }));
            expect(error2).toStrictEqual(new Errors.EmailAlreadyInUse({ email: uppercase }));
          }),
        config,
      );
    });

    describe("Users.updatePassword", () => {
      asyncProperty(
        "users can update their password",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const passwords = yield* Passwords;
            const session = yield* registerUser(users, register);
            const plain = makePlainCredentials(register.credential);
            const hashedNewPassword = yield* passwords.hash(newPassword);

            const authed = yield* users.authenticate(plain.credentials);
            expect(authed.user).toStrictEqual(session.user);

            yield* users.updatePassword(session.token, plain.credentials.password, hashedNewPassword);

            const credentialsNotRecognisedError = yield* Effect.flip(users.authenticate(plain.credentials));
            expect(credentialsNotRecognisedError).toStrictEqual(new Errors.CredentialNotRecognised());

            const credential = Credential.Plain.Email({
              email: register.credential.email,
              password: Password.Plaintext(newPassword),
            });
            const authed2 = yield* users.authenticate(credential);

            expect(authed2.user).toStrictEqual(session.user);
          }).pipe(Effect.provide(Passwords.layer)),

        config,
      );

      asyncProperty(
        "users cannot update their password with an expired session or invalid current password",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const passwords = yield* Passwords;
            const session = yield* registerUser(users, register);
            const plain = makePlainCredentials(register.credential);
            const hashedPassword = yield* passwords.hash(newPassword);

            const error0 = yield* Effect.flip(
              users.updatePassword(session.token, Password.Plaintext("whatever"), hashedPassword),
            );
            expect(error0).toStrictEqual(new Errors.CredentialNotRecognised());

            yield* users.logout(session.token);

            const error1 = yield* Effect.flip(
              users.updatePassword(session.token, plain.credentials.password, hashedPassword),
            );
            expect(error1).toStrictEqual(new NoSuchToken());
          }).pipe(Effect.provide(Passwords.layer)),
        config,
      );

      asyncProperty(
        "existing sessions expire when password is updated excluding the current session",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const passwords = yield* Passwords;
            const session0 = yield* registerUser(users, register);

            const plain = makePlainCredentials(register.credential);
            const hashedPassword = yield* passwords.hash(newPassword);

            const session1 = yield* users.authenticate(plain.credentials);

            yield* users.updatePassword(session1.token, plain.credentials.password, hashedPassword);

            const error = yield* Effect.flip(users.identify(session0.token));
            const session2 = yield* users.identify(session1.token);

            expect(error).toStrictEqual(new NoSuchToken());
            expect(session1.user).toStrictEqual(session0.user);
            expect(session2.user).toStrictEqual(session1.user);
          }).pipe(Effect.provide(Passwords.layer)),
        config,
      );
    });

    describe("Users.update", () => {
      asyncProperty(
        "users can update their first name / last name, and opt-in marketing status",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Users.Partial),
        ([registration, draft]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const session = yield* registerUser(users, registration);
            const foundById = yield* users.getById(session.user.id);
            yield* users.update(session.user.id, draft);
            const foundById2 = yield* users.getById(session.user.id);

            expect(foundById).toStrictEqual(session.user);
            expect(foundById2.value).toMatchObject(draft);
          }),
        config,
      );
    });

    describe("Users.resetPassword", () => {
      asyncProperty(
        "users can reset their password",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
        ([registration, password]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const passwords = yield* Passwords;

            const session0 = yield* registerUser(users, registration);
            const plain = makePlainCredentials(registration.credential);
            const hashedPassword = yield* passwords.hash(password);

            const token = yield* users.requestPasswordReset(registration.credential.email);

            yield* users.resetPassword(token, hashedPassword);

            const error = yield* Effect.flip(users.authenticate(plain.credentials));
            const session1 = yield* users.authenticate(
              Credential.Plain.Email({ email: plain.credentials.email, password: Password.Plaintext(password) }),
            );

            expect(error).toStrictEqual(new Errors.CredentialNotRecognised());
            expect(session1.user).toStrictEqual(session0.user);
          }).pipe(Effect.provide(Passwords.layer)),
        config,
      );

      asyncProperty(
        "existing sessions expire when password is reset",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
        ([register, password]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const passwords = yield* Passwords;

            const session0 = yield* registerUser(users, register);
            const plain = makePlainCredentials(register.credential);
            const hashedPassword = yield* passwords.hash(password);

            const session1 = yield* users.authenticate(plain.credentials);

            const token = yield* users.requestPasswordReset(register.credential.email);
            yield* users.resetPassword(token, hashedPassword);

            const error0 = yield* Effect.flip(users.identify(session0.token));
            const error1 = yield* Effect.flip(users.identify(session1.token));

            expect(error0).toStrictEqual(new NoSuchToken());
            expect(error1).toStrictEqual(new NoSuchToken());
          }).pipe(Effect.provide(Passwords.layer)),
        config,
      );

      asyncProperty(
        "password reset tokens are single-use",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
        ([register, password]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const passwords = yield* Passwords;

            yield* registerUser(users, register);
            const token = yield* users.requestPasswordReset(register.credential.email);
            const hashedNewPassword = yield* passwords.hash(password);
            yield* users.resetPassword(token, hashedNewPassword);
            const error = yield* Effect.flip(users.resetPassword(token, hashedNewPassword));

            expect(error).toStrictEqual(new NoSuchToken());
          }).pipe(Effect.provide(Passwords.layer)),
        config,
      );

      asyncProperty(
        "password reset request fails for unknown email address",
        Arbs.Email,
        (email) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;
            const error = yield* Effect.flip(users.requestPasswordReset(email));
            expect(error).toStrictEqual(new Errors.CredentialNotRecognised());
          }),
        config,
      );
    });

    describe("Users.linkCredential", () => {
      asyncProperty(
        "users can link many credentials",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Credentials.Google, Arbs.Credentials.Apple),
        ([registration, google, apple]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;

            const session = yield* registerUser(users, registration);

            yield* users.linkCredential(session.token, google);
            yield* users.linkCredential(session.token, apple);

            const identities = yield* users.identities(session.user.id);

            expect(identities).toEqual({
              Email: Option.some(User.identity.Identity.Email({ email: registration.credential.email })),
              Google: Option.some(User.identity.fromCredential(google)),
              Apple: Option.some(User.identity.fromCredential(apple)),
            });
          }),
      );

      // TODO: Arbs.Registration.Google
      asyncProperty(
        "users can link a single email credential",
        fc.tuple(Arbs.Credentials.EmailPassword, Arbs.Registration.Google),
        ([credential, registration]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;

            const session = yield* users.register(registration);

            const emailCredential = yield* makeSecureCredential(credential);
            const identities = yield* users.linkCredential(session.token, emailCredential);

            expect(identities).toEqual({
              Email: Option.some(User.identity.fromCredential(emailCredential)),
              Google: Option.some(User.identity.fromCredential(registration.credential)),
              Apple: Option.none(),
            });
          }),
      );

      asyncProperty(
        "users cannot link a credential that already exists",
        fc.tuple(Arbs.Registration.Apple, Arbs.Registration.Google),
        ([apple, google]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;

            yield* users.register(apple);
            const session = yield* users.register(google);

            const alreadyExistsError = yield* Effect.flip(users.linkCredential(session.token, apple.credential));

            expect(alreadyExistsError).toStrictEqual(new Errors.CredentialAlreadyExists());
          }),
      );
    });

    describe("Users.unlinkCredential", () => {
      asyncProperty(
        "users can unlink their email credential",
        fc.tuple(Arbs.Credentials.EmailPassword, Arbs.Registration.Google),
        ([credential, registration]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;

            const session = yield* users.register(registration);

            const emailCredential = yield* makeSecureCredential(credential);
            const identities1 = yield* users.linkCredential(session.token, emailCredential);
            const identities2 = yield* users.unlinkCredential(session.token, Credential.ProviderId.Email);

            expect(Option.isSome(identities1.Email)).toBeTruthy();
            expect(Option.isSome(identities2.Email)).toBeFalsy();
          }),
      );

      asyncProperty(
        "users can unlink their third party provider credential if they have an email credential",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Credentials.Google),
        ([registration, credential]) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;

            const session = yield* registerUser(users, registration);

            const identities1 = yield* users.linkCredential(session.token, credential);
            const identities2 = yield* users.unlinkCredential(session.token, credential._tag);

            expect(Option.isSome(identities1.Email)).toBeTruthy();
            expect(Option.isSome(identities1.Google)).toBeTruthy();
            expect(Option.isNone(identities2.Google)).toBeTruthy();
          }),
      );

      asyncProperty(
        "users cannot unlink their email credential if they have no fallback credential",
        Arbs.Registration.EmailPassword,
        (registration) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;

            const session = yield* registerUser(users, registration);
            const noFallbackError = yield* Effect.flip(
              users.unlinkCredential(session.token, Credential.ProviderId.Email),
            );

            expect(noFallbackError).toStrictEqual(new Errors.NoFallbackCredential());
          }),
      );

      asyncProperty(
        "users cannot unlink their third party provider credential if they have no fallback",
        Arbs.Registration.Google,
        (registration) =>
          Effect.gen(function* () {
            const { users } = yield* TestBench;

            const session = yield* users.register(registration);

            const noFallbackError = yield* Effect.flip(
              users.unlinkCredential(session.token, registration.credential._tag),
            );

            expect(noFallbackError).toStrictEqual(new Errors.NoFallbackCredential());
          }),
      );
    });
  };

  // TODO: move to test bench
  const registerUser = (users: Users, register: Arbs.Registration.EmailPassword) =>
    Effect.gen(function* () {
      const credential = yield* makeSecureCredential(register.credential);

      return yield* users.register({
        credential: Credential.Secure.Email(credential),
        firstName: register.firstName,
        lastName: register.lastName,
        optInMarketing: register.optInMarketing,
      });
    });

  const makePlainCredentials = (credentials: Credential.EmailPassword.Strong) => {
    return {
      credentials: Credential.Plain.Email({
        email: credentials.email,
        password: Password.Plaintext(credentials.password),
      }),
      lowercase: Credential.Plain.Email({
        email: makeEmail(credentials.email.toLowerCase()),
        password: Password.Plaintext(credentials.password),
      }),
      uppercase: Credential.Plain.Email({
        email: makeEmail(credentials.email.toUpperCase()),
        password: Password.Plaintext(credentials.password),
      }),
    };
  };

  const makeSecureCredential = (credential: Credential.EmailPassword.Strong) => {
    return Effect.gen(function* () {
      const passwords = yield* Passwords;
      const password = yield* passwords.hash(credential.password);
      return Credential.Secure.Email({ email: credential.email, password });
    }).pipe(Effect.provide(Passwords.layer));
  };
}

const makeEmail = S.decodeSync(Email);
