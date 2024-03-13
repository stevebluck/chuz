import { Sessions } from "core/index";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { Button } from "src/components/ui/button";
import { Redirect } from "src/server/Redirect";
import { RemixServer } from "src/server/Remix.server";

export const loader = RemixServer.loader(
  "MyAccount",
  Sessions.pipe(
    Effect.flatMap((sessions) => sessions.authenticated),
    Effect.asUnit,
    // TODO add returnTo
    Effect.catchTags({ Unauthorised: () => Redirect.make(Routes.login) }),
  ),
);

export default function MyAccount() {
  return (
    <div>
      my account
      <form method="POST" action={Routes.logout}>
        <Button>Logout</Button>
      </form>
    </div>
  );
}
