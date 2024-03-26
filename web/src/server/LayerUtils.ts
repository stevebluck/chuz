import { Config, Context, Layer } from "@chuz/prelude";

export namespace LayerUtils {
  export const config =
    <I, A>(tag: Context.Tag<I, A>) =>
    (config: Config.Config.Wrap<A>) =>
      Layer.effect(tag, Config.unwrap(config));
}
