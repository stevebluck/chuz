import { Clock, Context, Equivalence, Layer } from "effect";
import { Tokens } from "..";
import { ReferenceTokens } from "./ReferenceTokens";

export class NumberTokens extends Context.Tag("app/NumberTokens")<NumberTokens, Tokens<number>>() {
  static Test = Layer.effect(this, ReferenceTokens.create(Clock.make(), Equivalence.number));
}
