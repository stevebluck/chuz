import { Credential } from "@chuz/domain";
import { S } from "@chuz/prelude";

export const SocialProvider = S.struct({
  _tag: S.literal("Provider"),
  provider: Credential.SocialProvider,
});
