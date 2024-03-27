import * as S from "@effect/schema/Schema";
import { Equal, Equivalence } from "effect";
import { User } from ".";

export class IdentityProvider extends S.TaggedClass<IdentityProvider>()("IdentityProvider", {
  id: S.NonEmpty.pipe(S.brand("IdentityProviderId")),
  provider: S.NonEmpty,
  email: User.Email,
}) {
  static equals: Equivalence.Equivalence<IdentityProvider> = Equal.equals;
}
