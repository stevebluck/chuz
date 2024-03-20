import { Effect } from "effect";
import { Routes } from "src/Routes";
import { Button } from "src/components/ui/button";
import { App, Redirect, Sessions } from "src/server";

export const loader = App.loader(
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
