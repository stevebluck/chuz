import { Users } from "@chuz/core";
import { Email } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { RequestResetPasswordForm } from "src/auth/RequestResetPasswordForm";
import { useActionData } from "src/hooks/useActionData";
import * as Remix from "src/server/Remix";
import * as ServerRequest from "src/server/ServerRequest";
import { ServerResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";

type FormFields = S.Schema.Type<typeof FormFields>;
const FormFields = S.Struct({ email: Email });

export const action = Remix.action(
  Session.guest.pipe(
    Effect.zipRight(ServerRequest.formData(FormFields)),
    Effect.flatMap(({ email }) => Users.pipe(Effect.flatMap((users) => users.requestPasswordReset(email)))),
    Effect.flatMap(() => ServerResponse.ReturnTo(Routes.forgotPassword)),
    Effect.catchTags({
      AlreadyAuthenticated: () => ServerResponse.Redirect(Routes.dashboard),
      CredentialNotRecognised: () => ServerResponse.Fail("We could not find a user with that email"),
    }),
  ),
);

export default function ForgotPasswordPage() {
  const result = useActionData();

  return (
    <AuthContent
      to={Routes.login}
      toLabel="Login"
      title="Reset your password"
      description="We'll send you an email with a link to reset your password."
    >
      <pre>{JSON.stringify(result, null, 2)}</pre>
      <RequestResetPasswordForm />
    </AuthContent>
  );
}
