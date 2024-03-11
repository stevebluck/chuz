import { Sessions } from "core/index";
import { Effect } from "effect";
import { Redirect } from "src/Redirect";
import { RemixServer } from "src/Remix.server";
import { Routes } from "src/Routes";

export const loader = RemixServer.loader(
  Sessions.pipe(
    Effect.flatMap((sessions) => sessions.authenticated),
    Effect.asUnit,
    // TODO add returnTo
    Effect.catchTags({ Unauthorised: () => Redirect.make(Routes.login) }),
  ),
);

export default function MyAccount() {
  return <div>my account</div>;
}
