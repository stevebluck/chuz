import * as S from "@effect/schema/Schema";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { Remix, Session, ServerResponse } from "src/server";
import { OAuth } from "src/server/OAuth";
import { ServerRequest } from "src/server/ServerRequest";

const SearchParams = S.struct({
  code: S.string,
  provider: S.literal("google"),
});

// TODO: read the state cookie and validate it, unset at the end of request
export const loader = Remix.loader(
  ServerRequest.searchParams(SearchParams).pipe(
    Effect.flatMap(({ code, provider }) => OAuth.exchangeCodeForSession({ code, _tag: provider })),
    Effect.tap((session) => Session.mint(session)),
    Effect.flatMap(() => ServerResponse.Redirect(Routes.myAccount)),
    Effect.catchTags({
      SearchParamsError: ({ error }) => ServerResponse.ValidationError(error),
      EmailAlreadyInUse: () => ServerResponse.ValidationError({ email: ["Email already in use"] }),
    }),
  ),
);
