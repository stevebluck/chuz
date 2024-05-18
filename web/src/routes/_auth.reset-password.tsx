import { useSearchParams } from "@remix-run/react";
import { Routes } from "src/Routes";
import { AuthContent } from "src/components/auth/AuthContent";
import { ResetPasswordForm, ResetPasswordFormSchema } from "src/components/auth/ResetPasswordForm";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
import { ServerResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";
import { Passwords, Users } from "@chuz/core";
import { Id, Password, Token, User } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { S } from "@chuz/prelude";

const SearchParams = S.Struct({ token: S.NonEmpty });

export default function ResetPasswordPage() {
  // TODO get this from the loader
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  return (
    <AuthContent
      to={Routes.login}
      toLabel="Login"
      separatorText="or login with"
      socialButtonsAction={Routes.login}
      title="Set a new password"
      description="We'll send you an email with a link to reset your password."
    >
      {token ? <ResetPasswordForm token={token} /> : "Invalid token."}
    </AuthContent>
  );
}

export const action = Remix.unwrapAction(
  Effect.gen(function* () {
    const users = yield* Users;
    const passwords = yield* Passwords;

    return Session.guest.pipe(
      Effect.zipRight(
        Effect.all({
          password: ServerRequest.formData(ResetPasswordFormSchema).pipe(
            Effect.flatMap(({ password }) => passwords.hash(password)),
          ),
          token: Effect.map(ServerRequest.searchParams(SearchParams), ({ token }) =>
            Token.make<Password.Reset<Id<User.User>>>(token),
          ),
        }),
      ),
      Effect.flatMap(({ token, password }) => users.resetPassword(token, password)),
      Effect.flatMap(() => ServerResponse.Redirect(Routes.login)),
      Effect.catchTags({
        AlreadyAuthenticated: () => ServerResponse.Redirect(Routes.dashboard),
        NoSuchToken: () => ServerResponse.Unauthorized,
        SearchParamsError: ServerResponse.Unexpected,
      }),
    );
  }),
);
