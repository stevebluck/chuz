import { Context, Layer } from "effect";
import { remixRuntime } from "./Runtime";

// const MainTest = Layers.Users.Test.pipe(Layer.provide(PasswordResetTokens.Test), Layer.provide(UserTokens.Test));

const Chuz = Context.Tag<string>("Chuz")();

const Main = Layer.succeed(Chuz, "Chuz");
export const Remix = remixRuntime(Main);
