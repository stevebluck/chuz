import { Credentials, EmailPassword, Password, Token, User } from "@chuz/domain";
import { Effect, Option } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Passwords, Users } from "core/index";
import * as fc from "fast-check";
import { afterAll, describe, expect } from "vitest";
import { Arbs } from "../Arbs";
import { asyncProperty } from "../Property";
import { SpecConfig, defaultSpecConfig } from "../SpecConfig";
import { TestBench } from "../TestBench";

export namespace UsersSpec {
  export const run = (TestBench: Effect.Effect<TestBench.Seeded>, config: SpecConfig = defaultSpecConfig) => {
    afterAll(config.afterAll);

    asyncProperty(
      "users can register with unique emails (case insensitive)",
      Arbs.Users.Register,
      (register) =>
        Effect.gen(function* (_) {
          const { users } = yield* _(TestBench);
          const registerUserWithEmail = (email: S.EmailAddress) =>
            registerUser(users, { ...register, credentials: { ...register.credentials, email } });

          const session = yield* _(registerUserWithEmail(register.credentials.email));

          expect(session.user.value).toEqual(
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

          expect(error0).toEqual(new User.EmailAlreadyInUse({ email: register.credentials.email }));
          expect(error1).toEqual(new User.EmailAlreadyInUse({ email: lowercase }));
          expect(error2).toEqual(new User.EmailAlreadyInUse({ email: uppercase }));
        }),
      config,
    );

    asyncProperty(
      "users can be identifed by a session",
      Arbs.Users.Register,
      (registration) =>
        Effect.gen(function* (_) {
          const { users } = yield* _(TestBench);
          const session = yield* _(registerUser(users, registration));
          const identified = yield* _(users.identify(session.token));
          expect(identified.user).toEqual(session.user);
        }),
      config,
    );

    asyncProperty(
      "users can log out of a session",
      Arbs.Users.Register,
      (registration) =>
        Effect.gen(function* (_) {
          const { users } = yield* _(TestBench);
          const session = yield* _(registerUser(users, registration));
          yield* _(users.logout(session.token));
          const noSuchTokenError = yield* _(users.identify(session.token).pipe(Effect.flip));
          expect(noSuchTokenError).toEqual(new Token.NoSuchToken());
        }),
      config,
    );

    asyncProperty(
      "users can authenticate many sessions with their credentials (case insensitive)",
      Arbs.Users.Register,
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

          expect(authed.user).toEqual(session.user);
          expect(authed1.user).toEqual(session.user);
          expect(authed2.user).toEqual(session.user);
          expect(credentialsNotRecognisedError).toEqual(new Credentials.NotRecognised());
        }),
      config,
    );

    asyncProperty(
      "users can't authenticate via a third party identity provider after already registering with the same email",
      Arbs.Users.Register,
      (registration) =>
        Effect.gen(function* (_) {
          const { users } = yield* _(TestBench);
          const session0 = yield* _(registerUser(users, registration));

          const credential = new Credentials.SocialCredential({
            id: Credentials.SocialCredentialId("googleId"),
            provider: "google",
            email: registration.credentials.email,
          });

          const emailAlreadyInUseError = yield* _(users.authenticate(credential), Effect.flip);

          const foundUserById = yield* _(users.findById(session0.user.id));

          expect(foundUserById).toEqual(session0.user);
          expect(emailAlreadyInUseError).toEqual(new User.EmailAlreadyInUse({ email: registration.credentials.email }));
        }),
      config,
    );

    asyncProperty(
      "users can be found by id or email (case insensitive)",
      Arbs.Users.Register,
      (registration) =>
        Effect.gen(function* (_) {
          const { users } = yield* _(TestBench);
          const session = yield* _(registerUser(users, registration));
          const foundUserById = yield* _(users.findById(session.user.id));
          const foundUserByEmail = yield* _(users.findByEmail(registration.credentials.email));
          const foundUserByEmail1 = yield* _(
            users.findByEmail(makeEmail(registration.credentials.email.toLocaleLowerCase())),
          );
          const foundUserByEmail2 = yield* _(
            users.findByEmail(makeEmail(registration.credentials.email.toUpperCase())),
          );

          expect(foundUserById).toEqual(session.user);
          expect(foundUserByEmail).toEqual(session.user);
          expect(foundUserByEmail1).toEqual(session.user);
          expect(foundUserByEmail2).toEqual(session.user);
        }),
      config,
    );

    describe("Update", () => {
      asyncProperty(
        "users can update their first name / last name, and opt-in marketing status",
        fc.tuple(Arbs.Users.Register, Arbs.Users.PartialUser),
        ([registration, draft]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));
            const foundById = yield* _(users.findById(session.user.id));
            yield* _(users.update(session.user.id, draft));
            const foundById2 = yield* _(users.findById(session.user.id));
            expect(foundById).toEqual(session.user);
            expect(foundById2.value).toMatchObject(draft);
          }),
        config,
      );

      describe("Email", () => {
        asyncProperty(
          "users can update their email to a unique email",
          fc.tuple(Arbs.Users.Register, Arbs.Email),
          ([registration, newEmail]) =>
            Effect.gen(function* (_) {
              const { users } = yield* _(TestBench);
              const session = yield* _(registerUser(users, registration));
              const plain = makePlainCredentials(registration.credentials);

              const authed = yield* _(users.authenticate(plain.credentials));
              expect(authed.user).toEqual(session.user);

              const updated = yield* _(users.updateEmail(session.user.id, newEmail));

              expect(updated.value.email).toEqual(newEmail);

              const credentialsNotRecognisedError = yield* _(users.authenticate(plain.credentials).pipe(Effect.flip));
              expect(credentialsNotRecognisedError).toEqual(new Credentials.NotRecognised());

              const authed2 = yield* _(
                users.authenticate(new EmailPassword.Plain({ email: newEmail, password: plain.credentials.password })),
              );
              expect(authed2.user.id).toEqual(session.user.id);
            }),
          config,
        );

        asyncProperty(
          "users cannot update their email to an exisitng email (case insensitive)",
          fc.tuple(Arbs.Users.Register, Arbs.Users.Register),
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

              expect(error0).toEqual(new User.EmailAlreadyInUse({ email: user1.user.value.email }));
              expect(error1).toEqual(new User.EmailAlreadyInUse({ email: lowercase }));
              expect(error2).toEqual(new User.EmailAlreadyInUse({ email: uppercase }));
            }),
          config,
        );
      });

      describe("Password", () => {
        asyncProperty(
          "users can update their password",
          fc.tuple(Arbs.Users.Register, Arbs.Passwords.Strong),
          ([register, newPassword]) =>
            Effect.gen(function* (_) {
              const { users } = yield* _(TestBench);
              const session = yield* _(registerUser(users, register));
              const plain = makePlainCredentials(register.credentials);
              const hashedNewPassword = yield* _(hash(newPassword));

              const authed = yield* _(users.authenticate(plain.credentials));
              expect(authed.user).toEqual(session.user);

              yield* _(users.updatePassword(session.token, plain.credentials.password, hashedNewPassword));

              const credentialsNotRecognisedError = yield* _(users.authenticate(plain.credentials).pipe(Effect.flip));
              expect(credentialsNotRecognisedError).toEqual(new Credentials.NotRecognised());

              const authed2 = yield* _(
                users.authenticate(
                  new EmailPassword.Plain({
                    email: register.credentials.email,
                    password: Password.Plaintext(newPassword),
                  }),
                ),
              );
              expect(authed2.user).toEqual(session.user);
            }),

          config,
        );

        asyncProperty(
          "users cannot update their password with an expired session or invalid current password",
          fc.tuple(Arbs.Users.Register, Arbs.Passwords.Strong),
          ([register, newPassword]) =>
            Effect.gen(function* (_) {
              const { users } = yield* _(TestBench);
              const session = yield* _(registerUser(users, register));
              const plain = makePlainCredentials(register.credentials);
              const hashedPassword = yield* _(hash(newPassword));

              const error0 = yield* _(
                users.updatePassword(session.token, Password.Plaintext("whatever"), hashedPassword).pipe(Effect.flip),
              );
              expect(error0).toEqual(new Credentials.NotRecognised());

              yield* _(users.logout(session.token));

              const error1 = yield* _(
                users.updatePassword(session.token, plain.credentials.password, hashedPassword).pipe(Effect.flip),
              );
              expect(error1).toEqual(new User.NotFound());
            }),
          config,
        );

        asyncProperty(
          "existing sessions expire when password is updated excluding the current session",
          fc.tuple(Arbs.Users.Register, Arbs.Passwords.Strong),
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

              expect(error).toEqual(new Token.NoSuchToken());
              expect(session1.user).toEqual(session0.user);
              expect(session2.user).toEqual(session1.user);
            }),
          config,
        );
      });
    });

    describe("Password reset", () => {
      asyncProperty(
        "users can reset their password",
        fc.tuple(Arbs.Users.Register, Arbs.Passwords.Strong),
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

            expect(error).toEqual(new Credentials.NotRecognised());
            expect(session1.user).toEqual(session0.user);
          }),
        config,
      );

      asyncProperty(
        "existing sessions expire when password is reset",
        fc.tuple(Arbs.Users.Register, Arbs.Passwords.Strong),
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

            expect(error0).toEqual(new Token.NoSuchToken());
            expect(error1).toEqual(new Token.NoSuchToken());
          }),
        config,
      );

      asyncProperty(
        "password reset tokens are single-use",
        fc.tuple(Arbs.Users.Register, Arbs.Passwords.Strong),
        ([register, newPassword]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            yield* _(registerUser(users, register));
            const token = yield* _(users.requestPasswordReset(register.credentials.email));
            const hashedNewPassword = yield* _(hash(newPassword));
            yield* _(users.resetPassword(token, hashedNewPassword));
            const error = yield* _(users.resetPassword(token, hashedNewPassword).pipe(Effect.flip));

            expect(error).toEqual(new Token.NoSuchToken());
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
            expect(error).toEqual(new Credentials.NotRecognised());
          }),
        config,
      );
    });

    describe("Identities", () => {
      asyncProperty(
        "users can add many social identities",
        fc.tuple(Arbs.Users.Register, Arbs.Credentials.SocialCredential, Arbs.Credentials.SocialCredential),
        ([registration, socialCredential0, socialCredential1]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));
            yield* _(users.addIdentity(session.user.id, socialCredential0));
            yield* _(users.addIdentity(session.user.id, socialCredential1));

            const identities = yield* _(users.findIdentitiesById(session.user.id));

            expect(identities.length).toBe(3);
            expect(identities).toContainEqual(User.identity.EmailPassword({ email: registration.credentials.email }));
            expect(identities).toContainEqual(
              User.identity.SocialProvider({ email: socialCredential0.email, provider: socialCredential0.provider }),
            );
            expect(identities).toContainEqual(
              User.identity.SocialProvider({ email: socialCredential1.email, provider: socialCredential1.provider }),
            );
          }),
        config,
      );

      asyncProperty(
        "users can only have a single EmailPassword identity",
        fc.tuple(Arbs.Users.Register, Arbs.Passwords.Strong),
        ([registration, password]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));

            const plain = makePlainCredentials(registration.credentials);
            const hashedPassword = yield* _(hash(password));
            const newCredentials = new EmailPassword.Secure({
              email: plain.credentials.email,
              password: hashedPassword,
            });

            const credentialInUseError = yield* _(users.addIdentity(session.user.id, newCredentials), Effect.flip);

            expect(credentialInUseError).toEqual(new User.CredentialInUse());
          }),
        config,
      );

      asyncProperty(
        "users can add another identity and authenticate with it",
        fc.tuple(Arbs.Users.Register, Arbs.Credentials.SocialCredential),
        ([registration, socialCredential]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session0 = yield* _(registerUser(users, registration));
            const plain = makePlainCredentials(registration.credentials);

            yield* _(users.addIdentity(session0.user.id, socialCredential));

            const session1 = yield* _(users.authenticate(plain.credentials));
            const session2 = yield* _(users.authenticate(socialCredential));

            expect(session1.user).toEqual(session2.user);
          }),
        config,
      );

      asyncProperty(
        "users can remove a social identity if they have more than one identity",
        fc.tuple(Arbs.Users.Register, Arbs.Credentials.SocialCredential),
        ([registration, socialCredential]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));

            const twoIdentities = yield* _(users.addIdentity(session.user.id, socialCredential));

            const socialIdentity = User.identity.fromCredential(socialCredential);
            const emailIdentity = User.identity.EmailPassword({ email: registration.credentials.email });

            const oneIdentity = yield* _(users.removeIdentity(session.user.id, socialIdentity));
            const lastCredentialsError = yield* _(users.removeIdentity(session.user.id, emailIdentity), Effect.flip);

            expect(twoIdentities.length).toEqual(2);
            expect(oneIdentity).not.toContainEqual(socialIdentity);

            expect(oneIdentity[0]).toEqual(emailIdentity);

            expect(lastCredentialsError).toEqual(new User.LastCredentialError());
          }),
        config,
      );

      asyncProperty(
        "users can remove an email identity if they have more than one identity",
        fc.tuple(Arbs.Users.Register, Arbs.Credentials.SocialCredential),
        ([registration, socialCredential]) =>
          Effect.gen(function* (_) {
            const { users } = yield* _(TestBench);
            const session = yield* _(registerUser(users, registration));

            yield* _(users.addIdentity(session.user.id, socialCredential));

            const emailIdentity = User.identity.EmailPassword({ email: registration.credentials.email });
            const socialIdentity = User.identity.fromCredential(socialCredential);

            const oneIdentity = yield* _(users.removeIdentity(session.user.id, emailIdentity));
            const lastCredentialsError = yield* _(users.removeIdentity(session.user.id, socialIdentity), Effect.flip);

            expect(oneIdentity).toContainEqual(User.identity.fromCredential(socialCredential));
            expect(oneIdentity).not.toContainEqual(emailIdentity);
            expect(lastCredentialsError).toEqual(new User.LastCredentialError());
          }),
        config,
      );
    });
  };
  const registerUser = (users: Users, register: Arbs.Users.Register) =>
    Effect.gen(function* (_) {
      const hashed = yield* _(hash(register.credentials.password));
      const credential = new EmailPassword.Secure({
        email: register.credentials.email,
        password: hashed,
      });

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
}

const makeEmail = S.decodeSync(S.EmailAddress);
const hash = Passwords.hasher({ N: 2 });
