import { Credentials } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { Effect } from "effect";
import { Users, App, Redirect, ValidationError, Sessions } from "src/server";

class SearchParams extends S.Class<SearchParams>("SearchParams")({
  code: Credentials.Code.schema,
  next: S.string,
}) {}

export const loader = App.loaderSearchParams("Auth.authenticate", SearchParams, ({ code, next }) =>
  Users.authenticateByCode(code).pipe(
    Effect.flatMap(Sessions.mint),
    Effect.zipRight(Redirect.make(next)),
    Effect.catchTag("InvalidCode", (error) => ValidationError.make({ code: [error.message] })),
  ),
);
