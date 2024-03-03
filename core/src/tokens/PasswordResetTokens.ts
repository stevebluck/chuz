import { Password, User } from "@chuz/domain";
import { Clock, Context, Layer } from "effect";
import { Tokens } from "..";
import { ReferenceTokens } from "./ReferenceTokens";

export class PasswordResetTokens extends Context.Tag("app/PasswordResetTokens")<
  PasswordResetTokens,
  Tokens<Password.Reset<User>>
>() {
  static Test = Layer.effect(this, ReferenceTokens.create(Clock.make(), Password.Reset.equals));
}
