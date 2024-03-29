import { User } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { RequestResetPasswordForm } from "src/auth/RequestResetPasswordForm";
import { useActionData } from "src/hooks/useActionData";
import { Session, Http, Users } from "src/server";
import * as Remix from "src/server/Remix";

type FormFields = S.Schema.Type<typeof FormFields>;
const FormFields = S.struct({ email: User.Email });

export const action = Remix.action(
  Session.guest.pipe(
    Effect.zipRight(Http.request.formData(FormFields)),
    Effect.flatMap(({ email }) => Users.requestPasswordReset(email)),
    Effect.flatMap(Http.response.ok),
    Effect.catchTags({
      CredentialsNotRecognised: Http.response.badRequest,
      InvalidFormData: Http.response.validationError,
      AlreadyAuthenticated: () => Http.response.unauthorized,
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
