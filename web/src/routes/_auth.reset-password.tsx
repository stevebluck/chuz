import { Passwords, Users } from "@chuz/core";
import { Id, Password, Token, User } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { useSearchParams } from "@remix-run/react";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { ResetPasswordForm } from "src/auth/ResetPasswordForm";
import { useActionData } from "src/hooks/useActionData";
import * as Remix from "src/server/Remix";
import * as ServerRequest from "src/server/ServerRequest";
import * as ServerResponse from "src/server/ServerResponse";
import { Session } from "src/server/Session";

const FormFields = S.Struct({ password: Password.Strong });
const SearchParams = S.Struct({ token: S.NonEmpty });

export const action = Remix.unwrapAction(
  Effect.gen(function* () {
    const users = yield* Users;
    const passwords = yield* Passwords;

    return Session.guest.pipe(
      Effect.zipRight(
        Effect.all({
          password: Effect.flatMap(ServerRequest.formData(FormFields), ({ password }) => passwords.hash(password)),
          token: Effect.map(ServerRequest.searchParams(SearchParams), ({ token }) =>
            Token.make<Password.Reset<Id<User.User>>>(token),
          ),
        }),
      ),
      Effect.flatMap(({ token, password }) => users.resetPassword(token, password)),
      Effect.zipRight(ServerResponse.json({})),
    );
  }),
);

export default function ResetPasswordPage() {
  const result = useActionData();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  return (
    <AuthContent
      to={Routes.login}
      toLabel="Login"
      title="Set a new password"
      description="We'll send you an email with a link to reset your password."
    >
      <pre>{JSON.stringify(result, null, 2)}</pre>
      {token ? <ResetPasswordForm token={token} /> : "Invalid token."}
    </AuthContent>
  );
}
