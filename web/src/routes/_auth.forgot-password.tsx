import { Routes } from "src/Routes";
import { AuthContent } from "src/components/auth/AuthContent";
import { RequestResetPasswordForm, RequestResetPasswordFormSchema } from "src/components/auth/RequestResetPasswordForm";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
import { ServerResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";
import { Users } from "@chuz/core";
import { Effect } from "@chuz/prelude";

export default function ForgotPasswordPage() {
  return (
    <AuthContent
      separatorText="or login with"
      socialButtonsAction={Routes.login}
      to={Routes.login}
      toLabel="Login"
      title="Reset your password"
      description="We'll send you an email with a link to reset your password."
    >
      <RequestResetPasswordForm />
    </AuthContent>
  );
}

export const action = Remix.action(
  Session.guest.pipe(
    Effect.zipRight(ServerRequest.formData(RequestResetPasswordFormSchema)),
    Effect.flatMap(({ email }) => Users.pipe(Effect.flatMap((users) => users.requestPasswordReset(email)))),
    Effect.flatMap(() => ServerResponse.ReturnTo(Routes.forgotPassword)),
    Effect.catchTags({
      AlreadyAuthenticated: () => ServerResponse.Redirect(Routes.dashboard),
      CredentialNotRecognised: () => ServerResponse.FormRootError("We could not find a user with that email"),
    }),
  ),
);
