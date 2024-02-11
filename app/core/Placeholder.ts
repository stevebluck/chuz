import { Context, Layer } from "effect";

export class Placeholder extends Context.Tag("Placeholder")<Placeholder, { test: string }>() {}

export const PlaceholderLive = Layer.sync(Placeholder, () => new PlaceholderFake());

class PlaceholderFake implements Context.Tag.Service<Placeholder> {
  test = "hello";
}
