import { Credential, Password, User } from "@chuz/domain";
import { Effect, Match, S } from "@chuz/prelude";
import { fromCheckboxInput, optionalTextInput } from "src/FormSchema";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { RegisterForm } from "src/auth/RegisterForm";
import { useActionData } from "src/hooks/useActionData";
import { Session, Users, Http } from "src/server";
import * as Passwords from "src/server/Passwords";
import * as Remix from "src/server/Remix";
import * as Auth from "src/server/auth/Auth";
import { SocialAuth } from "src/server/auth/SocialAuth";
import { AppCookies } from "src/server/cookies/AppCookies";

type RegisterFormFields = S.Schema.Type<typeof RegisterFormFields>;
const RegisterFormFields = S.Union(
  S.Struct({
    _tag: S.Literal(Credential.ProviderId.Email),
    email: S.EmailAddress,
    password: Password.Strong,
    firstName: optionalTextInput(User.FirstName),
    lastName: optionalTextInput(User.LastName),
    optInMarketing: fromCheckboxInput(User.OptInMarketing),
  }),
  S.Struct({ _tag: S.Literal(Credential.ProviderId.Google) }),
);

export const action = Remix.action(
  Effect.flatMap(AppCookies.authState, (stateCookie) =>
    Session.guest.pipe(
      Effect.zipRight(Http.request.formData(RegisterFormFields)),
      Effect.flatMap(
        Match.typeTags<RegisterFormFields>()({
          Google: ({ _tag }) =>
            Effect.flatMap(Auth.makeState("register"), (state) =>
              SocialAuth.generateAuthUrl({ _tag, state }).pipe(
                Effect.flatMap(Http.response.redirect),
                Effect.flatMap(stateCookie.save(state)),
              ),
            ),
          Email: (registration) =>
            // TODO: Rename to Passwords.hash
            Passwords.Hasher.hash(registration.password).pipe(
              Effect.flatMap((hashed) =>
                Users.register({
                  credentials: Credential.Secure.Email({ email: registration.email, password: hashed }),
                  firstName: registration.firstName,
                  lastName: registration.lastName,
                  optInMarketing: registration.optInMarketing,
                }),
              ),
              Effect.tap(Session.mint),
              Effect.flatMap(() => Http.response.redirectToAccount),
            ),
        }),
      ),
      Effect.catchTags({
        AlreadyAuthenticated: () => Http.response.redirectToAccount,
        InvalidFormData: Http.response.validationError,
        EmailAlreadyInUse: Http.response.badRequest,
        CookieError: () => Http.response.exception,
        GenerateUrlError: () => Http.response.exception,
      }),
    ),
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
