import { Credential } from "@chuz/domain";
import { S } from "@chuz/prelude";

export const SocialProvider = S.Struct({
  _tag: S.Literal("Provider"),
  provider: Credential.SocialProvider,
});
