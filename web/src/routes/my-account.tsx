import { Effect } from "effect";
import { Routes } from "src/Routes";
import { Button } from "src/components/ui/button";
import { Remix, Session, ServerResponse } from "src/server";

export const loader = Remix.loader(
  Session.authenticated.pipe(
    Effect.flatMap(() => ServerResponse.Ok()),
    Effect.catchTag("Unauthorised", () => ServerResponse.Redirect(Routes.login)),
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
