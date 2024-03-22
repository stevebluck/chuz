import { Data, Match } from "effect";

export namespace IdentityProvider {
  export type Authorise = Data.TaggedEnum<{
    google: { code: string };
  }>;

  export namespace Authorise {
    export const match = Match.typeTags<Authorise>();
  }

  export type Provider = { _tag: Authorise["_tag"] };

  export namespace Provider {
    export const match = Match.typeTags<Provider>();
  }
}
