import { Credential, EmailPassword, Password, Token, User } from "@chuz/domain";
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
        Arbs.Users.EmailRegistration,
        (register) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const registerUserWithEmail = (email: S.EmailAddress) =>
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

            const error0 = yield* _(registerUserWithEmail(register.credentials.email).pipe(Effect.flip));
            const error1 = yield* _(registerUserWithEmail(lowercase).pipe(Effect.flip));
            const error2 = yield* _(registerUserWithEmail(uppercase).pipe(Effect.flip));

            expect(error0).toStrictEqual(new EmailAlreadyInUse({ email: register.credentials.email }));
            expect(error1).toStrictEqual(new EmailAlreadyInUse({ email: lowercase }));
            expect(error2).toStrictEqual(new EmailAlreadyInUse({ email: uppercase }));
          }),
        config,
      );

      asyncProperty("users can register with a third party provider", Arbs.Users.SocialRegistration, (registration) =>
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
        Arbs.Users.EmailRegistration,
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
        Arbs.Users.EmailRegistration,
        (registration) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));
            yield* _(users.logout(session.token));
            const noSuchTokenError = yield* _(users.identify(session.token).pipe(Effect.flip));
            expect(noSuchTokenError).toStrictEqual(new Token.NoSuchToken());
          }),
        config,
      );
    });

    describe("Users.authenticate", () => {
      asyncProperty(
        "users can authenticate many sessions with their email credential (case insensitive)",
        Arbs.Users.EmailRegistration,
        (registration) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));
            const plain = makePlainCredentials(registration.credentials);

            const authed = yield* _(users.authenticate(plain.credentials));

            const authed1 = yield* _(users.authenticate(plain.lowercase));
            const authed2 = yield* _(users.authenticate(plain.uppercase));
            const badCredentials = new EmailPassword.Plain({
              email: plain.credentials.email,
              password: Password.Plaintext(`bad-${plain.credentials.password}`),
            });
            const credentialsNotRecognisedError = yield* _(users.authenticate(badCredentials).pipe(Effect.flip));

            expect(authed.user).toStrictEqual(session.user);
            expect(authed1.user).toStrictEqual(session.user);
            expect(authed2.user).toStrictEqual(session.user);
            expect(credentialsNotRecognisedError).toStrictEqual(new Credential.NotRecognised());
          }),
        config,
      );

      asyncProperty(
        "users can authenticate with a third party provider credential",
        Arbs.Users.SocialRegistration,
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
        Arbs.Users.EmailRegistration,
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
        fc.tuple(Arbs.Users.EmailRegistration, Arbs.Email),
        ([registration, newEmail]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));
            const plain = makePlainCredentials(registration.credentials);

            const authed = yield* _(users.authenticate(plain.credentials));
            expect(authed.user).toStrictEqual(session.user);

            const updated = yield* _(users.updateEmail(session.user.id, newEmail));

            expect(updated.value.email).toStrictEqual(newEmail);

            const credentialsNotRecognisedError = yield* _(users.authenticate(plain.credentials).pipe(Effect.flip));
            expect(credentialsNotRecognisedError).toStrictEqual(new Credential.NotRecognised());

            const authed2 = yield* _(
              users.authenticate(new EmailPassword.Plain({ email: newEmail, password: plain.credentials.password })),
            );
            expect(authed2.user.id).toStrictEqual(session.user.id);
          }),
        config,
      );

      asyncProperty(
        "users cannot update their email to an exisitng email (case insensitive)",
        fc.tuple(Arbs.Users.EmailRegistration, Arbs.Users.EmailRegistration),
        ([register1, register2]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const user1 = yield* _(registerUser(users, register1));

            const user2 = yield* _(registerUser(users, register2));

            const lowercase = makeEmail(user1.user.value.email.toLocaleLowerCase());
            const uppercase = makeEmail(user1.user.value.email.toUpperCase());

            const error0 = yield* _(users.updateEmail(user2.user.id, user1.user.value.email).pipe(Effect.flip));
            const error1 = yield* _(users.updateEmail(user2.user.id, lowercase).pipe(Effect.flip));
            const error2 = yield* _(users.updateEmail(user2.user.id, uppercase).pipe(Effect.flip));

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
        fc.tuple(Arbs.Users.EmailRegistration, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, register));
            const plain = makePlainCredentials(register.credentials);
            const hashedNewPassword = yield* _(hash(newPassword));

            const authed = yield* _(users.authenticate(plain.credentials));
            expect(authed.user).toStrictEqual(session.user);

            yield* _(users.updatePassword(session.token, plain.credentials.password, hashedNewPassword));

            const credentialsNotRecognisedError = yield* _(users.authenticate(plain.credentials).pipe(Effect.flip));
            expect(credentialsNotRecognisedError).toStrictEqual(new Credential.NotRecognised());

            const authed2 = yield* _(
              users.authenticate(
                new EmailPassword.Plain({
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
        fc.tuple(Arbs.Users.EmailRegistration, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, register));
            const plain = makePlainCredentials(register.credentials);
            const hashedPassword = yield* _(hash(newPassword));

            const error0 = yield* _(
              users.updatePassword(session.token, Password.Plaintext("whatever"), hashedPassword).pipe(Effect.flip),
            );
            expect(error0).toStrictEqual(new Credential.NotRecognised());

            yield* _(users.logout(session.token));

            const error1 = yield* _(
              users.updatePassword(session.token, plain.credentials.password, hashedPassword).pipe(Effect.flip),
            );
            expect(error1).toStrictEqual(new Token.NoSuchToken());
          }),
        config,
      );

      asyncProperty(
        "existing sessions expire when password is updated excluding the current session",
        fc.tuple(Arbs.Users.EmailRegistration, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session0 = yield* _(registerUser(users, register));

            const plain = makePlainCredentials(register.credentials);
            const hashedPassword = yield* _(hash(newPassword));

            const session1 = yield* _(users.authenticate(plain.credentials));

            yield* _(users.updatePassword(session1.token, plain.credentials.password, hashedPassword));

            const error = yield* _(users.identify(session0.token).pipe(Effect.flip));
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
        fc.tuple(Arbs.Users.EmailRegistration, Arbs.Users.PartialUser),
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
        fc.tuple(Arbs.Users.EmailRegistration, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session0 = yield* _(registerUser(users, register));
            const plain = makePlainCredentials(register.credentials);
            const hashedPassword = yield* _(hash(newPassword));

            const token = yield* _(users.requestPasswordReset(register.credentials.email));

            yield* _(users.resetPassword(token, hashedPassword));

            const error = yield* _(users.authenticate(plain.credentials).pipe(Effect.flip));
            const session1 = yield* _(
              users.authenticate(
                new EmailPassword.Plain({
                  email: plain.credentials.email,
                  password: Password.Plaintext(newPassword),
                }),
              ),
            );

            expect(error).toStrictEqual(new Credential.NotRecognised());
            expect(session1.user).toStrictEqual(session0.user);
          }),
        config,
      );

      asyncProperty(
        "existing sessions expire when password is reset",
        fc.tuple(Arbs.Users.EmailRegistration, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session0 = yield* _(registerUser(users, register));
            const plain = makePlainCredentials(register.credentials);
            const hashedPassword = yield* _(hash(newPassword));

            const session1 = yield* _(users.authenticate(plain.credentials));

            const token = yield* _(users.requestPasswordReset(register.credentials.email));
            yield* _(users.resetPassword(token, hashedPassword));

            const error0 = yield* _(users.identify(session0.token).pipe(Effect.flip));
            const error1 = yield* _(users.identify(session1.token).pipe(Effect.flip));

            expect(error0).toStrictEqual(new Token.NoSuchToken());
            expect(error1).toStrictEqual(new Token.NoSuchToken());
          }),
        config,
      );

      asyncProperty(
        "password reset tokens are single-use",
        fc.tuple(Arbs.Users.EmailRegistration, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            yield* _(registerUser(users, register));
            const token = yield* _(users.requestPasswordReset(register.credentials.email));
            const hashedNewPassword = yield* _(hash(newPassword));
            yield* _(users.resetPassword(token, hashedNewPassword));
            const error = yield* _(users.resetPassword(token, hashedNewPassword).pipe(Effect.flip));

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
            const error = yield* _(users.requestPasswordReset(email).pipe(Effect.flip));
            expect(error).toStrictEqual(new Credential.NotRecognised());
          }),
        config,
      );
    });

    describe("Users.linkCredential", () => {
      asyncProperty(
        "users can link many credentials",
        fc.tuple(Arbs.Users.EmailRegistration, Arbs.Credentials.SocialCredential, Arbs.Credentials.SocialCredential),
        ([emailRegistration, credential1, credential2]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const session = yield* _(registerUser(users, emailRegistration));

            yield* _(users.linkCredential(session.token, credential1));
            yield* _(users.linkCredential(session.token, credential2));

            const identities = yield* _(users.identities(session.user.id));

            expect(identities[0]).toStrictEqual(
              Option.some(User.identity.EmailPassword({ email: emailRegistration.credentials.email })),
            );
            expect(identities[1].length).toBe(2);
            expect(identities[1]).toContainEqual(User.identity.fromCredential(credential1));
            expect(identities[1]).toContainEqual(User.identity.fromCredential(credential2));
          }),
      );

      asyncProperty(
        "users can link a single email credential",
        fc.tuple(Arbs.Credentials.StrongEmailPassword, Arbs.Users.SocialRegistration),
        ([emailPassword, socialRegistration]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const session = yield* _(users.register(socialRegistration));

            const emailCredential = yield* _(makeSecureCredential(emailPassword));
            const identities = yield* _(users.linkCredential(session.token, emailCredential));

            expect(Option.isSome(identities[0])).toBeTruthy();
            expect(identities[1].length).toBe(1);
          }),
      );

      asyncProperty(
        "users cannot link a credential that already exists",
        fc.tuple(Arbs.Users.SocialRegistration, Arbs.Users.SocialRegistration),
        ([socialRegistration1, socialRegistration2]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            yield* _(users.register(socialRegistration1));
            const session = yield* _(users.register(socialRegistration2));

            const alreadyExistsError = yield* _(
              users.linkCredential(session.token, socialRegistration1.credentials),
              Effect.flip,
            );

            expect(alreadyExistsError).toStrictEqual(new Credential.AlreadyExists());
          }),
      );
    });

    describe("Users.unlinkCredential", () => {
      asyncProperty(
        "users can unlink their email credential",
        fc.tuple(Arbs.Credentials.StrongEmailPassword, Arbs.Users.SocialRegistration),
        ([emailPassword, socialRegistration]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const session = yield* _(users.register(socialRegistration));

            const emailCredential = yield* _(makeSecureCredential(emailPassword));
            const identities1 = yield* _(users.linkCredential(session.token, emailCredential));
            const identities2 = yield* _(users.unlinkCredential(session.token, "email"));

            expect(Option.isSome(identities1[0])).toBeTruthy();
            expect(Option.isSome(identities2[0])).toBeFalsy();
          }),
      );

      asyncProperty(
        "users can unlink their third party provider credential if they have an email credential",
        fc.tuple(Arbs.Users.EmailRegistration, Arbs.Credentials.SocialCredential),
        ([registration, credential]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const session = yield* _(registerUser(users, registration));

            const identities1 = yield* _(users.linkCredential(session.token, credential));
            const identities2 = yield* _(users.unlinkCredential(session.token, credential.provider));

            expect(Option.isSome(identities1[0])).toBeTruthy();
            expect(identities2[1].length).toBe(0);
          }),
      );

      asyncProperty(
        "users cannot unlink their email credential if they have no fallback credential",
        Arbs.Users.EmailRegistration,
        (registration) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const session = yield* _(registerUser(users, registration));
            const noFallbackError = yield* _(users.unlinkCredential(session.token, "email"), Effect.flip);

            expect(noFallbackError).toStrictEqual(new Credential.NoFallbackAvailable());
          }),
      );

      asyncProperty(
        "users cannot unlink their third party provider credential if they have no email or other third party provider credential",
        Arbs.Users.SocialRegistration,
        (socialRegistration) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const provider = socialRegistration.credentials.provider;
            const session = yield* _(users.register(socialRegistration));

            const noFallbackError = yield* _(users.unlinkCredential(session.token, provider), Effect.flip);

            expect(noFallbackError).toStrictEqual(new Credential.NoFallbackAvailable());
          }),
      );

      asyncProperty(
        "users cannot unlink a credential if it does not exist",
        Arbs.Users.SocialRegistration,
        (socialRegistration) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);

            const session = yield* _(users.register(socialRegistration));

            const notRecognisedError = yield* _(users.unlinkCredential(session.token, "email"), Effect.flip);

            expect(notRecognisedError).toStrictEqual(new Credential.NotRecognised());
          }),
      );
    });
  };

  const registerUser = (users: Users, register: Arbs.Users.EmailRegistration) =>
    Effect.gen(function* (_) {
      const credential = yield* _(makeSecureCredential(register.credentials));

      return yield* _(
        users.register({
          credentials: credential,
          firstName: register.firstName,
          lastName: register.lastName,
          optInMarketing: register.optInMarketing,
        }),
      );
    });

  const makePlainCredentials = (credentials: EmailPassword.Strong) => {
    return {
      credentials: new EmailPassword.Plain({
        email: credentials.email,
        password: Password.Plaintext(credentials.password),
      }),
      lowercase: new EmailPassword.Plain({
        email: makeEmail(credentials.email.toLowerCase()),
        password: Password.Plaintext(credentials.password),
      }),
      uppercase: new EmailPassword.Plain({
        email: makeEmail(credentials.email.toUpperCase()),
        password: Password.Plaintext(credentials.password),
      }),
    };
  };

  const makeSecureCredential = (credential: EmailPassword.Strong) => {
    return Effect.gen(function* (_) {
      const hashed = yield* _(hash(credential.password));
      return new EmailPassword.Secure({
        email: credential.email,
        password: hashed,
      });
    });
  };
}

const makeEmail = S.decodeSync(S.EmailAddress);
const hash = Passwords.hasher({ N: 2 });
