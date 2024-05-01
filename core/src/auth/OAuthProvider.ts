import { OAuth, User } from "@chuz/domain";
import { Data, Effect } from "@chuz/prelude";
import { GenerateUrlFailure } from "../Errors";

export interface OAuthProvider {
  getUser: (code: OAuth.Code) => Effect.Effect<User.User, GetUserInfoError>;
  generateUrl: (state: OAuth.State) => Effect.Effect<OAuth.ProviderUrl, GenerateUrlFailure>;
}

export class GetUserInfoError extends Data.TaggedError("GetUserInfoError")<{ error: unknown }> {}

export class InvalidState extends Data.TaggedError("GetUserInfoError")<{ error: unknown }> {}
