import { EmailPassword, Password, User } from "@chuz/domain";
import { Effect, Match, S } from "@chuz/prelude";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { RegisterForm } from "src/auth/RegisterForm";
import { SocialProvider } from "src/auth/SocialProviders";
import { useActionData } from "src/hooks/useActionData";
import { Session, Users, Http } from "src/server";
import * as Passwords from "src/server/Passwords";
import * as Remix from "src/server/Remix";
import * as Auth from "src/server/auth/Auth";
import { SocialAuth } from "src/server/auth/SocialAuth";
import { AppCookies } from "src/server/cookies/AppCookies";

type RegisterFormFields = S.Schema.Type<typeof RegisterFormFields>;
const RegisterFormFields = S.union(
  S.struct({
    _tag: S.literal("Strong"),
    email: User.Email,
    password: Password.Strong,
    firstName: S.optionalTextInput(User.FirstName),
    lastName: S.optionalTextInput(User.LastName),
    optInMarketing: S.fromCheckboxInput(User.OptInMarketing),
  }),
  SocialProvider,
);

export const action = Remix.action(
  Effect.flatMap(AppCookies.authState, (stateCookie) =>
    Session.guest.pipe(
      Effect.zipRight(Http.request.formData(RegisterFormFields)),
      Effect.flatMap(
        Match.typeTags<RegisterFormFields>()({
          Provider: ({ provider }) =>
            Effect.flatMap(Auth.makeState("register"), (state) =>
              SocialAuth.generateAuthUrl({ _tag: provider, state }).pipe(
                Effect.flatMap(Http.response.redirect),
                Effect.flatMap(stateCookie.save(state)),
              ),
            ),
          Strong: ({ email, firstName, lastName, optInMarketing, password }) =>
            Passwords.Hasher.hash(password).pipe(
              Effect.flatMap((hashed) =>
                Users.register({
                  credentials: new EmailPassword.Secure({ email, password: hashed }),
                  firstName,
                  lastName,
                  optInMarketing,
                }),
              ),
              Effect.flatMap(Session.mint),
              Effect.zipRight(Http.response.redirect(Routes.myAccount)),
            ),
        }),
      ),
      Effect.catchTags({
        AlreadyAuthenticated: () => Http.response.unauthorized,
        InvalidFormData: Http.response.validationError,
        EmailAlreadyInUse: Http.response.badRequest,
        CookieError: Http.response.serverError,
        GenerateUrlError: Http.response.serverError,
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
