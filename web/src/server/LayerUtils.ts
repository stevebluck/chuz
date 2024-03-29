import { Config, Context, Layer } from "@chuz/prelude";

export class LayerUtils {
  static config =
    <I, A>(tag: Context.Tag<I, A>) =>
    (config: Config.Config.Wrap<A>) =>
      Layer.effect(tag, Config.unwrap(config));
}
