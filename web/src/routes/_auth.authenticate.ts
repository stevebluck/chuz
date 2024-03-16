import { Credentials } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { Effect } from "effect";
import { Users } from "src/server/App";
import { Redirect, ValidationError } from "src/server/Response";
import { Runtime } from "src/server/Runtime.server";
import { Sessions } from "src/server/Sessions";

class SearchParams extends S.Class<SearchParams>("SearchParams")({
  code: Credentials.AuthCode.schema,
  next: S.string,
}) {}

export const loader = Runtime.loaderSearchParams("Auth.authenticate", SearchParams, ({ code, next }) =>
  Users.authenticateByOAuth(code).pipe(
    Effect.flatMap(Sessions.mint),
    Effect.zipRight(Redirect.make(next)),
    Effect.catchTag("InvalidAuthCode", (error) => ValidationError.make({ code: [error.message] })),
  ),
);
