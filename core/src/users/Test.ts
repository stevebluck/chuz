import { Context, Effect, Layer } from "effect";

class UsersRepository extends Context.Tag("UsersRepository")<
  UsersRepository,
  { create: (name: string) => Effect.Effect<{ name: string }> }
>() {
  // In memory implementation
  static Test = Layer.effect(UsersRepository, Effect.succeed({ create: (name) => Effect.succeed({ name }) }));
  // Real DB implementation
  static Live = Layer.effect(UsersRepository, Effect.succeed({ create: (name) => Effect.succeed({ name }) }));
}

class Alerts extends Context.Tag("Alerts")<Alerts, { notify: Effect.Effect<void> }>() {
  // Console.log implementation
  static Test = Layer.effect(Alerts, Effect.succeed({ notify: Effect.unit }));
  // Email implementation
  static Live = Layer.effect(Alerts, Effect.succeed({ notify: Effect.unit }));
}

// This guy does not care about what implementation is used
// Does all the business logic like sending alerts and saving to the DB
class Users extends Context.Tag("Users")<Users, { register: (name: string) => Effect.Effect<{ name: string }> }>() {
  static Live = Layer.effect(
    Users,
    Effect.gen(function* (_) {
      const repo = yield* _(UsersRepository);
      const alerts = yield* _(Alerts);

      return Users.of({
        register: (name) => repo.create(name).pipe(Effect.tap(() => alerts.notify)),
      });
    }),
  );
}

// Test version
const MainTest = Users.Live.pipe(Layer.provide(Alerts.Test), Layer.provide(UsersRepository.Test));

// Live version
const MainLive = Users.Live.pipe(Layer.provide(Alerts.Live), Layer.provide(UsersRepository.Live));
