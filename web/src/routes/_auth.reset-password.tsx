import { Password, Token, User } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { useSearchParams } from "@remix-run/react";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { ResetPasswordForm } from "src/auth/ResetPasswordForm";
import { useActionData } from "src/hooks/useActionData";
import { Session, Http, Users } from "src/server";
import { Hasher } from "src/server/Passwords";
import * as Remix from "src/server/Remix";

const FormFields = S.struct({ password: Password.Strong });
const SearchParams = S.struct({ token: S.NonEmpty });

export const action = Remix.action(
  Session.guest.pipe(
    Effect.zipRight(
      Effect.all({
        password: Effect.flatMap(Http.request.formData(FormFields), ({ password }) => Hasher.hash(password)),
        token: Effect.map(Http.request.searchParams(SearchParams), ({ token }) =>
          Token.make<[User.Email, User.Id]>(token),
        ),
      }),
    ),
    Effect.flatMap(({ token, password }) => Users.resetPassword(token, password)),
    Effect.zipRight(Http.response.ok()),
    Effect.catchTags({
      SearchParamsError: Http.response.badRequest,
      NoSuchToken: Http.response.badRequest,
      InvalidFormData: Http.response.validationError,
      AlreadyAuthenticated: () => Http.response.unauthorized,
    }),
  ),
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
