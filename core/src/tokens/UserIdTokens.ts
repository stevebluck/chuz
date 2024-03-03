import { Id, Identified, User } from "@chuz/domain";
import { Clock, Context, Layer } from "effect";
import { Tokens } from "..";
import { ReferenceTokens } from "./ReferenceTokens";

export class UserIdTokens extends Context.Tag("app/UserTokens")<UserIdTokens, Tokens<Id<User>>>() {
  static Test = Layer.effect(this, ReferenceTokens.create(Clock.make(), Identified.equals));
}
