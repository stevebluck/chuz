import { Credential, Email, Password, User } from "@chuz/domain";
import { Effect, Match, S } from "@chuz/prelude";
import { Api } from "src/Api";
import { fromCheckboxInput, optionalTextInput } from "src/FormSchema";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { RegisterForm } from "src/auth/RegisterForm";
import { useActionData } from "src/hooks/useActionData";
import { Session, Http, Cookies } from "src/server";
import * as Remix from "src/server/Remix";

type RegisterFormFields = S.Schema.Type<typeof RegisterFormFields>;
const RegisterFormFields = S.Union(
  S.Struct({
    _tag: S.Literal(Credential.ProviderId.Email),
    email: Email,
    password: Password.Strong,
    firstName: optionalTextInput(User.FirstName),
    lastName: optionalTextInput(User.LastName),
    optInMarketing: fromCheckboxInput(User.OptInMarketing),
  }),
  S.Struct({ _tag: S.Literal(Credential.ProviderId.Google) }),
);

const match = Match.typeTags<RegisterFormFields>();

export const action = Remix.action(
  Session.guest.pipe(
    Effect.zipRight(Http.request.formData(RegisterFormFields)),
    Effect.flatMap(
      match({
        Google: () =>
          Effect.gen(function* (_) {
            const cookie = yield* _(Cookies.AuthState);
            const [url, state] = yield* _(Api.generateGoogleAuthUrl("register"));

            return yield* _(Http.response.redirect(url).pipe(Effect.flatMap(Http.response.setCookie(cookie, state))));
          }),
        Email: (registration) =>
          Credential.EmailPassword.Strong.make(registration.email, registration.password).pipe(
            Effect.flatMap((credential) => Api.registerWithEmail(credential, registration)),
            Effect.flatMap(Session.mint),
            Effect.zipRight(Http.response.redirectToAccount),
          ),
      }),
    ),
    Effect.catchTags({
      AlreadyAuthenticated: () => Http.response.redirectToAccount,
      InvalidFormData: Http.response.badRequest,
      EmailAlreadyInUse: Http.response.badRequest,
      GenerateUrlError: () => Http.response.serverError,
    }),
  ),
);

export default function RegisterPage() {
  const result = useActionData();

  return (
    <AuthContent to={Routes.login} toLabel="Login" title="Create an account" description="Lets get learning!">
      <pre>{JSON.stringify(result, null, 2)}</pre>
      <RegisterForm error={{}} />
    </AuthContent>
  );
}
