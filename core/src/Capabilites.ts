import { Context, Layer } from "effect";
import { Users, ReferenceUsers } from ".";

export class Capabilities extends Context.Tag("core/Capabilities")<Capabilities, Users>() {
  static Test = Layer.mergeAll(ReferenceUsers);
  static Live = Layer.mergeAll(ReferenceUsers);
}
