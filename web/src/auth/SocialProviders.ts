import { S } from "@chuz/prelude";
import { ProviderName } from "src/server/auth/Auth";

export const SocialProvider = S.struct({
  _tag: S.literal("Provider"),
  provider: ProviderName,
});
