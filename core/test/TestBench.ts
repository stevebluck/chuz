import { Credentials, Password, Session } from "@chuz/domain";
import { Effect, TestClock, TestContext } from "@chuz/prelude";
import { Capabilities, Passwords, Users } from "../src";
import { Emails } from "../src/emails/Emails";
import { ReferenceUsers } from "../src/users/ReferenceUsers";

export interface TestBench extends Omit<Capabilities, "clock"> {
  clock: TestClock.TestClock;
  registerUser: TestBench.RegisterUser;
  makePlainCredentials: TestBench.MakePlainCredentials;
}

export namespace TestBench {
  export type WithBench = <E>(test: (bench: TestBench) => Effect.Effect<void, E>) => Effect.Effect<void, E>;

  export type RegisterUser = (
    registration: Omit<Users.Registration, "credentials"> & { credentials: Credentials.EmailPassword.Strong },
  ) => Effect.Effect<Session, Credentials.AlreadyInUse>;

  export type MakePlainCredentials = (credentials: Credentials.EmailPassword.Strong) => {
    credentials: Credentials.EmailPassword.Plain;
    lowercase: Credentials.EmailPassword.Plain;
    uppercase: Credentials.EmailPassword.Plain;
  };

  const saltRounds = Passwords.SaltRounds(4);
  const match = Passwords.match(saltRounds);
  const hash = Passwords.hash(saltRounds);

  export const withBench: WithBench = (test) =>
    Effect.gen(function* () {
      const clock: TestClock.TestClock = yield* TestClock.testClock();

      const registerUser: RegisterUser = (registration) =>
        Effect.gen(function* () {
          const hashed = yield* hash(registration.credentials.password);
          const credentials = Credentials.EmailPassword.Secure({ email: registration.credentials.email, password: hashed });
          return yield* users.register({
            credentials,
            firstName: registration.firstName,
            lastName: registration.lastName,
            optInMarketing: registration.optInMarketing,
          });
        });

      const makePlainCredentials = (credentials: Credentials.EmailPassword.Strong) => {
        return {
          credentials: Credentials.EmailPassword.Plain({
            email: credentials.email,
            password: Password.Plaintext.unsafeFrom(credentials.password),
          }),
          lowercase: Credentials.EmailPassword.Plain({
            email: Emails.toLowerCase(credentials.email),
            password: Password.Plaintext.unsafeFrom(credentials.password),
          }),
          uppercase: Credentials.EmailPassword.Plain({
            email: Emails.toUpperCase(credentials.email),
            password: Password.Plaintext.unsafeFrom(credentials.password),
          }),
        };
      };

      const users = yield* ReferenceUsers.make(clock, match);

      return yield* test({
        users,
        clock,
        registerUser,
        makePlainCredentials,
      });
    });

  export interface Seeded extends TestBench {
    seed: {};
  }

  export type WithSeed = <E>(test: (bench: Seeded) => Effect.Effect<void, E>) => Effect.Effect<void, E>;

  export namespace Seeded {
    export const withSeed =
      (withBench: WithBench): WithSeed =>
      (test) =>
        withBench((bench) =>
          Effect.gen(function* () {
            return yield* test({ ...bench, seed: {} });
          }).pipe(Effect.orDie, Effect.provide(TestContext.TestContext)),
        );
  }

  export const withSeed = Seeded.withSeed(withBench);
}
