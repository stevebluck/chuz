import { Effect } from "effect";
import { Routes } from "src/Routes";
import { Button } from "src/components/ui/button";
import { Redirect } from "src/server/Redirect";
import { Runtime } from "src/server/Runtime.server";
import { Sessions } from "src/server/Sessions";

export const loader = Runtime.loader(
  "MyAccount",
  Sessions.authenticated.pipe(
    Effect.asUnit,
    Effect.catchTag("Unauthorised", () => Redirect.make(Routes.login)),
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
