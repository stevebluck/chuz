import { Credential, Email, Password, Token, User } from "@chuz/domain";
import { Effect, Option } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { EmailAlreadyInUse, Passwords, Users } from "core/index";
import * as fc from "fast-check";
import { afterAll, describe, expect } from "vitest";
import { Arbs } from "../Arbs";
import { asyncProperty } from "../Property";
import { SpecConfig, defaultSpecConfig } from "../SpecConfig";
import { TestBench } from "../TestBench";

export namespace UsersSpec {
  export const run = (TestBench: Effect.Effect<TestBench.Seeded>, config: SpecConfig = defaultSpecConfig) => {
    afterAll(config.afterAll);

    describe("Users.register", () => {
      asyncProperty(
        "users can register with unique emails (case insensitive)",
        Arbs.Registration.EmailPassword,
        (register) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const registerUserWithEmail = (email: Email) =>
              registerUser(users, { ...register, credentials: { ...register.credentials, email } });

            const session = yield* _(registerUserWithEmail(register.credentials.email));

            expect(session.user.value).toStrictEqual(
              User.make({
                firstName: register.firstName,
                lastName: register.lastName,
                email: register.credentials.email,
                optInMarketing: register.optInMarketing,
              }),
            );

            const uppercase = makeEmail(register.credentials.email.toUpperCase());
            const lowercase = makeEmail(register.credentials.email.toLocaleLowerCase());

            const error0 = yield* _(registerUserWithEmail(register.credentials.email), Effect.flip);
            const error1 = yield* _(registerUserWithEmail(lowercase), Effect.flip);
            const error2 = yield* _(registerUserWithEmail(uppercase), Effect.flip);

            expect(error0).toStrictEqual(new EmailAlreadyInUse({ email: register.credentials.email }));
            expect(error1).toStrictEqual(new EmailAlreadyInUse({ email: lowercase }));
            expect(error2).toStrictEqual(new EmailAlreadyInUse({ email: uppercase }));
          }),
        config,
      );

      asyncProperty("users can register with a third party provider", Arbs.Registration.Google, (registration) =>
        Effect.gen(function* (_) {
          const { users } = yield* _(TestBench);

          const session = yield* _(users.register(registration));

          const user = yield* _(users.getByEmail(registration.credentials.email));

          expect(user).toStrictEqual(session.user);
        }),
      );
    });

    describe("Users.identify", () => {
      asyncProperty(
        "users can be identifed by a session",
        Arbs.Registration.EmailPassword,
        (registration) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));
            const identified = yield* _(users.identify(session.token));
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
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));
            yield* _(users.logout(session.token));
            const noSuchTokenError = yield* _(users.identify(session.token), Effect.flip);
            expect(noSuchTokenError).toStrictEqual(new Token.NoSuchToken());
          }),
        config,
      );
    });

    describe("Users.authenticate", () => {
      asyncProperty(
        "users can authenticate many sessions with their email credential (case insensitive)",
        Arbs.Registration.EmailPassword,
        (registration) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));
            const plain = makePlainCredentials(registration.credentials);

            const authed = yield* _(users.authenticate(plain.credentials));

            const authed1 = yield* _(users.authenticate(plain.lowercase));
            const authed2 = yield* _(users.authenticate(plain.uppercase));
            const badCredentials = Credential.Plain.Email({
              email: plain.credentials.email,
              password: Password.Plaintext(`bad-${plain.credentials.password}`),
            });
            const credentialsNotRecognisedError = yield* _(users.authenticate(badCredentials), Effect.flip);

            expect(authed.user).toStrictEqual(session.user);
            expect(authed1.user).toStrictEqual(session.user);
            expect(authed2.user).toStrictEqual(session.user);
            expect(credentialsNotRecognisedError).toStrictEqual(new Credential.NotRecognised());
          }),
        config,
      );

      asyncProperty(
        "users can authenticate with a third party provider credential",
        Arbs.Registration.Google,
        (registration) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            yield* _(users.register(registration));

            const session = yield* _(users.authenticate(registration.credentials));
            const user = yield* _(users.getByEmail(registration.credentials.email));

            expect(session.user).toStrictEqual(user);
          }),
      );
    });

    describe("Users.getBy*", () => {
      asyncProperty(
        "users can be found by id or email (case insensitive)",
        Arbs.Registration.EmailPassword,
        (registration) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));
            const foundUserById = yield* _(users.getById(session.user.id));
            const foundUserByEmail = yield* _(users.getByEmail(registration.credentials.email));
            const foundUserByEmail1 = yield* _(
              users.getByEmail(makeEmail(registration.credentials.email.toLocaleLowerCase())),
            );
            const foundUserByEmail2 = yield* _(
              users.getByEmail(makeEmail(registration.credentials.email.toUpperCase())),
            );

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
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));
            const plain = makePlainCredentials(registration.credentials);

            const authed = yield* _(users.authenticate(plain.credentials));
            expect(authed.user).toStrictEqual(session.user);

            const updated = yield* _(users.updateEmail(session.user.id, newEmail));

            expect(updated.value.email).toStrictEqual(newEmail);

            const credentialsNotRecognisedError = yield* _(users.authenticate(plain.credentials), Effect.flip);
            expect(credentialsNotRecognisedError).toStrictEqual(new Credential.NotRecognised());

            const authed2 = yield* _(
              users.authenticate(Credential.Plain.Email({ email: newEmail, password: plain.credentials.password })),
            );
            expect(authed2.user.id).toStrictEqual(session.user.id);
          }),
        config,
      );

      asyncProperty(
        "users cannot update their email to an exisitng email (case insensitive)",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Registration.EmailPassword),
        ([register1, register2]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const user1 = yield* _(registerUser(users, register1));

            const user2 = yield* _(registerUser(users, register2));

            const lowercase = makeEmail(user1.user.value.email.toLocaleLowerCase());
            const uppercase = makeEmail(user1.user.value.email.toUpperCase());

            const error0 = yield* _(users.updateEmail(user2.user.id, user1.user.value.email), Effect.flip);
            const error1 = yield* _(users.updateEmail(user2.user.id, lowercase), Effect.flip);
            const error2 = yield* _(users.updateEmail(user2.user.id, uppercase), Effect.flip);

            expect(error0).toStrictEqual(new EmailAlreadyInUse({ email: user1.user.value.email }));
            expect(error1).toStrictEqual(new EmailAlreadyInUse({ email: lowercase }));
            expect(error2).toStrictEqual(new EmailAlreadyInUse({ email: uppercase }));
          }),
        config,
      );
    });

    describe("Users.updatePassword", () => {
      asyncProperty(
        "users can update their password",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, register));
            const plain = makePlainCredentials(register.credentials);
            const hashedNewPassword = yield* _(hash(newPassword));

            const authed = yield* _(users.authenticate(plain.credentials));
            expect(authed.user).toStrictEqual(session.user);

            yield* _(users.updatePassword(session.token, plain.credentials.password, hashedNewPassword));

            const credentialsNotRecognisedError = yield* _(users.authenticate(plain.credentials), Effect.flip);
            expect(credentialsNotRecognisedError).toStrictEqual(new Credential.NotRecognised());

            const authed2 = yield* _(
              users.authenticate(
                Credential.Plain.Email({
                  email: register.credentials.email,
                  password: Password.Plaintext(newPassword),
                }),
              ),
            );
            expect(authed2.user).toStrictEqual(session.user);
          }),

        config,
      );

      asyncProperty(
        "users cannot update their password with an expired session or invalid current password",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, register));
            const plain = makePlainCredentials(register.credentials);
            const hashedPassword = yield* _(hash(newPassword));

            const error0 = yield* _(
              users.updatePassword(session.token, Password.Plaintext("whatever"), hashedPassword),
              Effect.flip,
            );
            expect(error0).toStrictEqual(new Credential.NotRecognised());

            yield* _(users.logout(session.token));

            const error1 = yield* _(
              users.updatePassword(session.token, plain.credentials.password, hashedPassword),
              Effect.flip,
            );
            expect(error1).toStrictEqual(new Token.NoSuchToken());
          }),
        config,
      );

      asyncProperty(
        "existing sessions expire when password is updated excluding the current session",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session0 = yield* _(registerUser(users, register));

            const plain = makePlainCredentials(register.credentials);
            const hashedPassword = yield* _(hash(newPassword));

            const session1 = yield* _(users.authenticate(plain.credentials));

            yield* _(users.updatePassword(session1.token, plain.credentials.password, hashedPassword));

            const error = yield* _(users.identify(session0.token), Effect.flip);
            const session2 = yield* _(users.identify(session1.token));

            expect(error).toStrictEqual(new Token.NoSuchToken());
            expect(session1.user).toStrictEqual(session0.user);
            expect(session2.user).toStrictEqual(session1.user);
          }),
        config,
      );
    });

    describe("Users.update", () => {
      asyncProperty(
        "users can update their first name / last name, and opt-in marketing status",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Users.Partial),
        ([registration, draft]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));
            const foundById = yield* _(users.getById(session.user.id));
            yield* _(users.update(session.user.id, draft));
            const foundById2 = yield* _(users.getById(session.user.id));

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
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session0 = yield* _(registerUser(users, registration));
            const plain = makePlainCredentials(registration.credentials);
            const hashedPassword = yield* _(hash(password));

            const token = yield* _(users.requestPasswordReset(registration.credentials.email));

            yield* _(users.resetPassword(token, hashedPassword));

            const error = yield* _(users.authenticate(plain.credentials), Effect.flip);
            const session1 = yield* _(
              users.authenticate(
                Credential.Plain.Email({ email: plain.credentials.email, password: Password.Plaintext(password) }),
              ),
            );

            expect(error).toStrictEqual(new Credential.NotRecognised());
            expect(session1.user).toStrictEqual(session0.user);
          }),
        config,
      );

      asyncProperty(
        "existing sessions expire when password is reset",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
        ([register, password]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session0 = yield* _(registerUser(users, register));
            const plain = makePlainCredentials(register.credentials);
            const hashedPassword = yield* _(hash(password));

            const session1 = yield* _(users.authenticate(plain.credentials));

            const token = yield* _(users.requestPasswordReset(register.credentials.email));
            yield* _(users.resetPassword(token, hashedPassword));

            const error0 = yield* _(users.identify(session0.token), Effect.flip);
            const error1 = yield* _(users.identify(session1.token), Effect.flip);

            expect(error0).toStrictEqual(new Token.NoSuchToken());
            expect(error1).toStrictEqual(new Token.NoSuchToken());
          }),
        config,
      );

      asyncProperty(
        "password reset tokens are single-use",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
        ([register, password]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            yield* _(registerUser(users, register));
            const token = yield* _(users.requestPasswordReset(register.credentials.email));
            const hashedNewPassword = yield* _(hash(password));
            yield* _(users.resetPassword(token, hashedNewPassword));
            const error = yield* _(users.resetPassword(token, hashedNewPassword), Effect.flip);

            expect(error).toStrictEqual(new Token.NoSuchToken());
          }),
        config,
      );

      asyncProperty(
        "password reset request fails for unknown email address",
        Arbs.Email,
        (email) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const error = yield* _(users.requestPasswordReset(email), Effect.flip);
            expect(error).toStrictEqual(new Credential.NotRecognised());
          }),
        config,
      );
    });

    describe("Users.linkCredential", () => {
      asyncProperty(
        "users can link many credentials",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Credentials.Google, Arbs.Credentials.Apple),
        ([registration, google, apple]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const session = yield* _(registerUser(users, registration));

            yield* _(users.linkCredential(session.token, google));
            yield* _(users.linkCredential(session.token, apple));

            const identities = yield* _(users.identities(session.user.id));

            expect(identities).toEqual({
              Email: Option.some(User.identity.Identity.Email({ email: registration.credentials.email })),
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
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const session = yield* _(users.register(registration));

            const emailCredential = yield* _(makeSecureCredential(credential));
            const identities = yield* _(users.linkCredential(session.token, emailCredential));

            expect(identities).toEqual({
              Email: Option.some(User.identity.fromCredential(emailCredential)),
              Google: Option.some(User.identity.fromCredential(registration.credentials)),
              Apple: Option.none(),
            });
          }),
      );

      asyncProperty(
        "users cannot link a credential that already exists",
        fc.tuple(Arbs.Registration.Apple, Arbs.Registration.Google),
        ([apple, google]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            yield* _(users.register(apple));
            const session = yield* _(users.register(google));

            const alreadyExistsError = yield* _(users.linkCredential(session.token, apple.credentials), Effect.flip);

            expect(alreadyExistsError).toStrictEqual(new Credential.AlreadyExists());
          }),
      );
    });

    describe("Users.unlinkCredential", () => {
      asyncProperty(
        "users can unlink their email credential",
        fc.tuple(Arbs.Credentials.EmailPassword, Arbs.Registration.Google),
        ([credential, registration]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const session = yield* _(users.register(registration));

            const emailCredential = yield* _(makeSecureCredential(credential));
            const identities1 = yield* _(users.linkCredential(session.token, emailCredential));
            const identities2 = yield* _(users.unlinkCredential(session.token, Credential.ProviderId.Email));

            expect(Option.isSome(identities1.Email)).toBeTruthy();
            expect(Option.isSome(identities2.Email)).toBeFalsy();
          }),
      );

      asyncProperty(
        "users can unlink their third party provider credential if they have an email credential",
        fc.tuple(Arbs.Registration.EmailPassword, Arbs.Credentials.Google),
        ([registration, credential]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const session = yield* _(registerUser(users, registration));

            const identities1 = yield* _(users.linkCredential(session.token, credential));
            const identities2 = yield* _(users.unlinkCredential(session.token, credential._tag));

            expect(Option.isSome(identities1.Email)).toBeTruthy();
            expect(Option.isSome(identities1.Google)).toBeTruthy();
            expect(Option.isNone(identities2.Google)).toBeTruthy();
          }),
      );

      asyncProperty(
        "users cannot unlink their email credential if they have no fallback credential",
        Arbs.Registration.EmailPassword,
        (registration) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const session = yield* _(registerUser(users, registration));
            const noFallbackError = yield* _(
              users.unlinkCredential(session.token, Credential.ProviderId.Email),
              Effect.flip,
            );

            expect(noFallbackError).toStrictEqual(new Credential.NoFallbackAvailable());
          }),
      );

      asyncProperty(
        "users cannot unlink their third party provider credential if they have no fallback",
        Arbs.Registration.Google,
        (registration) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const session = yield* _(users.register(registration));

            const noFallbackError = yield* _(
              users.unlinkCredential(session.token, registration.credentials._tag),
              Effect.flip,
            );

            expect(noFallbackError).toStrictEqual(new Credential.NoFallbackAvailable());
          }),
      );
    });
  };

  const registerUser = (users: Users, register: Arbs.Registration.EmailPassword) =>
    Effect.gen(function* (_) {
      const credential = yield* _(makeSecureCredential(register.credentials));

      return yield* _(
        users.register({
          credentials: Credential.Secure.Email(credential),
          firstName: register.firstName,
          lastName: register.lastName,
          optInMarketing: register.optInMarketing,
        }),
      );
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
    return Effect.gen(function* (_) {
      const password = yield* _(hash(credential.password));
      return Credential.Secure.Email({ email: credential.email, password });
    });
  };
}

const makeEmail = S.decodeSync(Email);
const hash = Passwords.hasher({ N: 2 });
