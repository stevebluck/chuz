import * as S from "@effect/schema/Schema";
import { Data, Match } from "effect";

export namespace IdentityProvider {
  export type AuthCode = S.Schema.Type<typeof AuthCode>;
  export const AuthCode = S.string.pipe(S.brand("AuthCode"));

  export type Identity = Data.TaggedEnum<{
    google: { code: AuthCode };
  }>;

  export const { google } = Data.taggedEnum<Identity>();
  export const match = Match.typeTags<Identity>();

  export type Provider = { _tag: Identity["_tag"] };

  export namespace Provider {
    export const match = Match.typeTags<Provider>();
  }
}
