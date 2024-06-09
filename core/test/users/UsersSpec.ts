import { it } from "@effect/vitest";
import { describe, expect } from "vitest";
import { Credential, Email, Identity, Password, User } from "@chuz/domain";
import { Context, Effect, Layer, Option, fc } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { NoSuchToken } from "../../src/Errors";
import { Passwords, Users } from "../../src/index";
import * as Errors from "../../src/users/Errors";
import { Arbs, EmailPasswordRegistration } from "../Arbs";
import { asyncProperty } from "../Property";
import { Seeds } from "../Seed";

const TestLayer = Context.GenericTag<Layer.Layer<Seeds | Users | Passwords>>("TestLayer");

const Suite = Effect.gen(function* () {
  const layer = yield* TestLayer;

  describe("Users.register", () => {
    asyncProperty(
      "users can register with unique emails (case insensitive)",
      Arbs.Registration.EmailPassword,
      (register) =>
        Effect.gen(function* () {
          const registerUserWithEmail = (email: Email) =>
            registerUser({ ...register, credential: { ...register.credential, email } });

          const session = yield* registerUserWithEmail(register.credential.email);

          expect(session.user.value).toStrictEqual(
            User.make({
              email: register.credential.email,
              firstName: register.firstName,
              lastName: register.lastName,
              optInMarketing: register.optInMarketing,
            }),
          );

          const uppercase = makeEmail(register.credential.email.toUpperCase());
          const lowercase = makeEmail(register.credential.email.toLocaleLowerCase());

          const error0 = yield* Effect.flip(registerUserWithEmail(register.credential.email));
          const error1 = yield* Effect.flip(registerUserWithEmail(lowercase));
          const error2 = yield* Effect.flip(registerUserWithEmail(uppercase));

          expect(error0).toStrictEqual(new Errors.CredentialAlreadyInUse());
          expect(error1).toStrictEqual(new Errors.CredentialAlreadyInUse());
          expect(error2).toStrictEqual(new Errors.CredentialAlreadyInUse());
        }).pipe(Effect.provide(layer)),
    );

    asyncProperty("users can register with a third party provider", Arbs.Registration.Google, () =>
      Effect.gen(function* () {
        const users = yield* Users;
        const { session } = yield* Seeds;

        const user = yield* users.getByEmail(session.user.value.email);

        expect(user).toStrictEqual(session.user);
      }).pipe(Effect.provide(layer)),
    );
  });

  describe("Users.identify", () => {
    asyncProperty("users can be identifed by a session", Arbs.Registration.EmailPassword, () =>
      Effect.gen(function* () {
        const users = yield* Users;
        const { session } = yield* Seeds;
        const identified = yield* users.identify(session.token);

        expect(identified.user).toStrictEqual(session.user);
      }).pipe(Effect.provide(layer)),
    );
  });

  describe("Users.logout", () => {
    it.scoped("users can log out of a session", () =>
      Effect.gen(function* () {
        const users = yield* Users;
        const { session } = yield* Seeds;
        yield* users.logout(session.token);
        const noSuchTokenError = yield* Effect.flip(users.identify(session.token));
        expect(noSuchTokenError).toStrictEqual(new NoSuchToken());
      }).pipe(Effect.provide(layer)),
    );
  });

  describe("Users.authenticate", () => {
    asyncProperty(
      "users can authenticate many sessions with their email credential (case insensitive)",
      Arbs.Registration.EmailPassword,
      (registration) =>
        Effect.gen(function* () {
          const users = yield* Users;
          const session = yield* registerUser(registration);
          const plain = makePlainCredentials(registration.credential);

          const authed = yield* users.authenticate(plain.credentials);

          const authed1 = yield* users.authenticate(plain.lowercase);
          const authed2 = yield* users.authenticate(plain.uppercase);
          const badCredentials = Credential.Plain.EmailPassword({
            email: plain.credentials.email,
            password: Password.Plaintext.make(`bad-${plain.credentials.password}`),
          });
          const credentialsNotRecognisedError = yield* Effect.flip(users.authenticate(badCredentials));

          expect(authed.user).toStrictEqual(session.user);
          expect(authed1.user).toStrictEqual(session.user);
          expect(authed2.user).toStrictEqual(session.user);
          expect(credentialsNotRecognisedError).toStrictEqual(new Errors.CredentialNotRecognised());
        }).pipe(Effect.provide(layer)),
    );

    asyncProperty(
      "users can authenticate with a third party provider credential",
      Arbs.Registration.Google,
      (registration) =>
        Effect.gen(function* () {
          const users = yield* Users;

          yield* users.register(
            registration.credential,
            registration.firstName,
            registration.lastName,
            registration.optInMarketing,
          );

          const session = yield* users.authenticate(registration.credential);
          const user = yield* users.getByEmail(registration.credential.email);

          expect(session.user).toStrictEqual(user);
        }).pipe(Effect.provide(layer)),
    );
  });

  describe("Users.getBy*", () => {
    it.effect("users can be found by id or email (case insensitive)", () =>
      Effect.gen(function* () {
        const users = yield* Users;
        const { session } = yield* Seeds;
        const foundUserById = yield* users.getById(session.user.id);

        const foundUserByEmail = yield* users.getByEmail(session.user.value.email);
        const foundUserByEmail1 = yield* users.getByEmail(makeEmail(session.user.value.email.toLocaleLowerCase()));
        const foundUserByEmail2 = yield* users.getByEmail(makeEmail(session.user.value.email.toUpperCase()));

        expect(foundUserById).toStrictEqual(session.user);
        expect(foundUserByEmail).toStrictEqual(session.user);
        expect(foundUserByEmail1).toStrictEqual(session.user);
        expect(foundUserByEmail2).toStrictEqual(session.user);
      }).pipe(Effect.provide(layer)),
    );
  });

  describe("Users.updateEmail", () => {
    asyncProperty(
      "users can update their email to a unique email",
      fc.tuple(Arbs.Registration.EmailPassword, Arbs.Email),
      ([registration, newEmail]) =>
        Effect.gen(function* () {
          const users = yield* Users;
          const session = yield* registerUser(registration);
          const plain = makePlainCredentials(registration.credential);

          const authed = yield* users.authenticate(plain.credentials);
          expect(authed.user).toStrictEqual(session.user);

          const updated = yield* users.updateEmail(session.user.id, newEmail);

          expect(updated.value.email).toStrictEqual(newEmail);

          const credentialsNotRecognisedError = yield* Effect.flip(users.authenticate(plain.credentials));
          expect(credentialsNotRecognisedError).toStrictEqual(new Errors.CredentialNotRecognised());

          const authed2 = yield* users.authenticate(
            Credential.Plain.EmailPassword({ email: newEmail, password: plain.credentials.password }),
          );
          expect(authed2.user.id).toStrictEqual(session.user.id);
        }).pipe(Effect.provide(layer)),
    );

    asyncProperty(
      "users cannot update their email to an exisitng email (case insensitive)",
      Arbs.Registration.EmailPassword,
      (register) =>
        Effect.gen(function* () {
          const users = yield* Users;
          const { session: session0 } = yield* Seeds;

          const session2 = yield* registerUser(register);

          const lowercase = makeEmail(session0.user.value.email.toLocaleLowerCase());
          const uppercase = makeEmail(session0.user.value.email.toUpperCase());

          const error0 = yield* Effect.flip(users.updateEmail(session2.user.id, session0.user.value.email));
          const error1 = yield* Effect.flip(users.updateEmail(session2.user.id, lowercase));
          const error2 = yield* Effect.flip(users.updateEmail(session2.user.id, uppercase));

          expect(error0).toStrictEqual(new Errors.EmailAlreadyInUse({ email: session0.user.value.email }));
          expect(error1).toStrictEqual(new Errors.EmailAlreadyInUse({ email: session0.user.value.email }));
          expect(error2).toStrictEqual(new Errors.EmailAlreadyInUse({ email: session0.user.value.email }));
        }).pipe(Effect.provide(layer)),
    );
  });

  describe("Users.updatePassword", () => {
    asyncProperty(
      "users can update their password",
      fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
      ([register, newPassword]) =>
        Effect.gen(function* () {
          const users = yield* Users;
          const passwords = yield* Passwords;

          const session = yield* registerUser(register);
          const plain = makePlainCredentials(register.credential);
          const hashedNewPassword = yield* passwords.hash(newPassword);

          const authed = yield* users.authenticate(plain.credentials);
          expect(authed.user).toStrictEqual(session.user);

          yield* users.updatePassword(session.token, plain.credentials.password, hashedNewPassword);

          const credentialsNotRecognisedError = yield* Effect.flip(users.authenticate(plain.credentials));
          expect(credentialsNotRecognisedError).toStrictEqual(new Errors.CredentialNotRecognised());

          const credential = Credential.Plain.EmailPassword({
            email: register.credential.email,
            password: Password.Plaintext.make(newPassword),
          });
          const authed2 = yield* users.authenticate(credential);

          expect(authed2.user).toStrictEqual(session.user);
        }).pipe(Effect.provide(layer)),
    );

    asyncProperty(
      "users cannot update their password with an expired session or invalid current password",
      fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
      ([register, newPassword]) =>
        Effect.gen(function* () {
          const users = yield* Users;
          const passwords = yield* Passwords;

          const session = yield* registerUser(register);
          const plain = makePlainCredentials(register.credential);
          const hashedPassword = yield* passwords.hash(newPassword);

          const error0 = yield* Effect.flip(
            users.updatePassword(session.token, Password.Plaintext.make("whatever"), hashedPassword),
          );
          expect(error0).toStrictEqual(new Errors.CredentialNotRecognised());

          yield* users.logout(session.token);

          const error1 = yield* Effect.flip(
            users.updatePassword(session.token, plain.credentials.password, hashedPassword),
          );
          expect(error1).toStrictEqual(new NoSuchToken());
        }).pipe(Effect.provide(layer)),
    );

    asyncProperty(
      "existing sessions expire when password is updated excluding the current session",
      fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
      ([registration, newPassword]) =>
        Effect.gen(function* () {
          const users = yield* Users;
          const passwords = yield* Passwords;
          const session0 = yield* registerUser(registration);

          const plain = makePlainCredentials(registration.credential);
          const hashedPassword = yield* passwords.hash(newPassword);

          const session1 = yield* users.authenticate(plain.credentials);

          yield* users.updatePassword(session1.token, plain.credentials.password, hashedPassword);

          const error = yield* Effect.flip(users.identify(session0.token));
          const session2 = yield* users.identify(session1.token);

          expect(error).toStrictEqual(new NoSuchToken());
          expect(session1.user).toStrictEqual(session0.user);
          expect(session2.user).toStrictEqual(session1.user);
        }).pipe(Effect.provide(layer)),
    );
  });

  describe("Users.update", () => {
    asyncProperty(
      "users can update their first name / last name, and opt-in marketing status",
      Arbs.Users.Partial,
      (draft) =>
        Effect.gen(function* () {
          const users = yield* Users;
          const { session } = yield* Seeds;

          const foundById = yield* users.getById(session.user.id);

          yield* users.update(session.user.id, draft);

          const foundById2 = yield* users.getById(session.user.id);

          expect(foundById).toStrictEqual(session.user);
          expect(foundById2.value).toMatchObject(draft);
        }).pipe(Effect.provide(layer)),
    );
  });

  describe("Users.resetPassword", () => {
    asyncProperty(
      "users can reset their password",
      fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
      ([registration, password]) =>
        Effect.gen(function* () {
          const users = yield* Users;
          const passwords = yield* Passwords;

          const session0 = yield* registerUser(registration);
          const plain = makePlainCredentials(registration.credential);
          const hashedPassword = yield* passwords.hash(password);

          const token = yield* users.requestPasswordReset(registration.credential.email);

          yield* users.resetPassword(token, hashedPassword);

          const error = yield* Effect.flip(users.authenticate(plain.credentials));
          const session1 = yield* users.authenticate(
            Credential.Plain.EmailPassword({
              email: plain.credentials.email,
              password: Password.Plaintext.make(password),
            }),
          );

          expect(error).toStrictEqual(new Errors.CredentialNotRecognised());
          expect(session1.user).toStrictEqual(session0.user);
        }).pipe(Effect.provide(layer)),
    );

    asyncProperty(
      "existing sessions expire when password is reset",
      fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
      ([register, password]) =>
        Effect.gen(function* () {
          const users = yield* Users;
          const passwords = yield* Passwords;

          const session0 = yield* registerUser(register);
          const plain = makePlainCredentials(register.credential);
          const hashedPassword = yield* passwords.hash(password);

          const session1 = yield* users.authenticate(plain.credentials);

          const token = yield* users.requestPasswordReset(register.credential.email);
          yield* users.resetPassword(token, hashedPassword);

          const error0 = yield* Effect.flip(users.identify(session0.token));
          const error1 = yield* Effect.flip(users.identify(session1.token));

          expect(error0).toStrictEqual(new NoSuchToken());
          expect(error1).toStrictEqual(new NoSuchToken());
        }).pipe(Effect.provide(layer)),
    );

    asyncProperty(
      "password reset tokens are single-use",
      fc.tuple(Arbs.Registration.EmailPassword, Arbs.Passwords.Strong),
      ([register, password]) =>
        Effect.gen(function* () {
          const users = yield* Users;
          const passwords = yield* Passwords;

          yield* registerUser(register);
          const token = yield* users.requestPasswordReset(register.credential.email);
          const hashedNewPassword = yield* passwords.hash(password);

          yield* users.resetPassword(token, hashedNewPassword);
          const error = yield* Effect.flip(users.resetPassword(token, hashedNewPassword));

          expect(error).toStrictEqual(new NoSuchToken());
        }).pipe(Effect.provide(layer)),
    );

    asyncProperty("password reset request fails for unknown email address", Arbs.Email, (email) =>
      Effect.gen(function* () {
        const users = yield* Users;
        const error = yield* Effect.flip(users.requestPasswordReset(email));
        expect(error).toStrictEqual(new Errors.CredentialNotRecognised());
      }).pipe(Effect.provide(layer)),
    );
  });

  describe("Users.linkCredential", () => {
    asyncProperty(
      "users can link many credentials",
      fc.tuple(Arbs.Credentials.Google, Arbs.Credentials.Apple),
      ([google, apple]) =>
        Effect.gen(function* () {
          const users = yield* Users;

          const { session } = yield* Seeds;

          yield* users.linkCredential(session.token, google);
          yield* users.linkCredential(session.token, apple);

          const identities = yield* users.identities(session.user.id);

          expect(identities).toEqual({
            EmailPassword: Option.some(Identity.EmailPassword.make(session.user.value.email)),
            Google: Option.some(Identity.Google.make(google.email)),
            Apple: Option.some(Identity.Apple.make(apple.email)),
          });
        }).pipe(Effect.provide(layer)),
    );

    asyncProperty(
      "users can link a single email credential",
      fc.tuple(Arbs.Credentials.EmailPassword, Arbs.Registration.Google),
      ([credential, registration]) =>
        Effect.gen(function* () {
          const users = yield* Users;

          const session = yield* users.register(
            registration.credential,
            registration.firstName,
            registration.lastName,
            registration.optInMarketing,
          );

          const emailCredential = yield* makeSecureCredential(credential);
          const identities = yield* users.linkCredential(session.token, emailCredential);

          expect(identities).toEqual({
            EmailPassword: Option.some(Identity.EmailPassword.make(emailCredential.email)),
            Google: Option.some(Identity.Google.make(registration.credential.email)),
            Apple: Option.none(),
          });
        }).pipe(Effect.provide(layer)),
    );

    asyncProperty(
      "users cannot link a credential that already exists",
      fc.tuple(Arbs.Registration.Apple, Arbs.Registration.Google),
      ([apple, google]) =>
        Effect.gen(function* () {
          const users = yield* Users;

          yield* users.register(apple.credential, apple.firstName, apple.lastName, apple.optInMarketing);

          const session = yield* users.register(
            google.credential,
            google.firstName,
            google.lastName,
            google.optInMarketing,
          );

          const alreadyExistsError = yield* Effect.flip(users.linkCredential(session.token, apple.credential));

          expect(alreadyExistsError).toStrictEqual(new Errors.CredentialAlreadyInUse());
        }).pipe(Effect.provide(layer)),
    );
  });

  describe("Users.unlinkCredential", () => {
    asyncProperty(
      "users can unlink their email credential",
      fc.tuple(Arbs.Credentials.EmailPassword, Arbs.Registration.Google),
      ([credential, registration]) =>
        Effect.gen(function* () {
          const users = yield* Users;

          const session = yield* users.register(
            registration.credential,
            registration.firstName,
            registration.lastName,
            registration.optInMarketing,
          );

          const emailCredential = yield* makeSecureCredential(credential);
          const identities1 = yield* users.linkCredential(session.token, emailCredential);
          const identities2 = yield* users.unlinkCredential(session.token, Credential.Tag.EmailPassword);

          expect(Option.isSome(identities1.EmailPassword)).toBeTruthy();
          expect(Option.isSome(identities2.EmailPassword)).toBeFalsy();
        }).pipe(Effect.provide(layer)),
    );

    asyncProperty(
      "users can unlink their third party provider credential if they have an email credential",
      fc.tuple(Arbs.Registration.EmailPassword, Arbs.Credentials.Google),
      ([registration, credential]) =>
        Effect.gen(function* () {
          const users = yield* Users;

          const session = yield* registerUser(registration);

          const identities1 = yield* users.linkCredential(session.token, credential);
          const identities2 = yield* users.unlinkCredential(session.token, credential._tag);

          expect(Option.isSome(identities1.EmailPassword)).toBeTruthy();
          expect(Option.isSome(identities1.Google)).toBeTruthy();
          expect(Option.isNone(identities2.Google)).toBeTruthy();
        }).pipe(Effect.provide(layer)),
    );

    asyncProperty(
      "users cannot unlink their email credential if they have no fallback credential",
      Arbs.Registration.EmailPassword,
      (registration) =>
        Effect.gen(function* () {
          const users = yield* Users;

          const session = yield* registerUser(registration);
          const noFallbackError = yield* Effect.flip(
            users.unlinkCredential(session.token, Credential.Tag.EmailPassword),
          );

          expect(noFallbackError).toStrictEqual(new Errors.NoFallbackCredential());
        }).pipe(Effect.provide(layer)),
    );

    it.effect("users cannot unlink their third party provider credential if they have no fallback", () =>
      Effect.gen(function* () {
        const users = yield* Users;

        const { session } = yield* Seeds;

        const noFallbackError = yield* Effect.flip(users.unlinkCredential(session.token, "EmailPassword"));

        expect(noFallbackError).toStrictEqual(new Errors.NoFallbackCredential());
      }).pipe(Effect.provide(layer)),
    );

    asyncProperty(
      "users can unlink their third party provider if they have another provider as a fallback",
      fc.tuple(Arbs.Registration.Google, Arbs.Credentials.Apple),
      ([google, apple]) =>
        Effect.gen(function* () {
          const users = yield* Users;

          const session = yield* users.register(
            google.credential,
            google.firstName,
            google.lastName,
            google.optInMarketing,
          );

          yield* users.linkCredential(session.token, apple);

          const identities = yield* users.unlinkCredential(session.token, "Apple");

          expect(identities).toStrictEqual({
            Google: Option.some(new Identity.Google({ email: google.credential.email })),
            Apple: Option.none(),
            EmailPassword: Option.none(),
          });
        }).pipe(Effect.provide(layer)),
    );
  });
});

export const UsersSpec = { Suite, TestLayer };

const registerUser = (register: EmailPasswordRegistration) =>
  Effect.gen(function* () {
    const users = yield* Users;
    const credential = yield* makeSecureCredential(register.credential);

    return yield* users.register(credential, register.firstName, register.lastName, register.optInMarketing);
  });

const makePlainCredentials = (cred: { email: Email; password: Password.Strong }) => {
  return {
    credentials: Credential.Plain.EmailPassword({
      email: cred.email,
      password: Password.Plaintext.make(cred.password),
    }),
    lowercase: Credential.Plain.EmailPassword({
      email: makeEmail(cred.email.toLowerCase()),
      password: Password.Plaintext.make(cred.password),
    }),
    uppercase: Credential.Plain.EmailPassword({
      email: makeEmail(cred.email.toUpperCase()),
      password: Password.Plaintext.make(cred.password),
    }),
  };
};

const makeSecureCredential = (cred: { email: Email; password: Password.Strong }) => {
  return Effect.gen(function* () {
    const passwords = yield* Passwords;
    const password = yield* passwords.hash(cred.password);
    return Credential.Secure.EmailPassword({ email: cred.email, password });
  });
};

const makeEmail = S.decodeSync(Email);
