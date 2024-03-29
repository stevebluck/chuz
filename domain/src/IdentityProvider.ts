import { Equal, Equivalence } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { User } from ".";

export class IdentityProvider extends S.TaggedClass<IdentityProvider>()("IdentityProvider", {
  id: S.NonEmpty.pipe(S.brand("IdentityProviderId")),
  provider: S.NonEmpty,
  email: User.Email,
}) {
  static equals: Equivalence.Equivalence<IdentityProvider> = Equal.equals;
}
