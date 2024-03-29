import { EmailPassword, Password, User } from "@chuz/domain";
import { Effect, Match } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/auth-content";
import { RegisterForm } from "src/auth/register-form";
import { useActionData } from "src/hooks/useActionData";
import { Session, Users, ServerResponse } from "src/server";
import * as Passwords from "src/server/Passwords";
import * as Remix from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
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
  S.struct({
    _tag: S.literal("Provider"),
    provider: Auth.ProviderName,
  }),
);

export const action = Remix.action(
  Effect.flatMap(AppCookies.authState, (stateCookie) =>
    Session.guest.pipe(
      Effect.zipRight(ServerRequest.formData(RegisterFormFields)),
      Effect.flatMap(
        Match.typeTags<RegisterFormFields>()({
          Provider: ({ provider }) =>
            Effect.flatMap(Auth.makeState("register"), (state) =>
              SocialAuth.generateAuthUrl({ _tag: provider, state }).pipe(
                Effect.flatMap(ServerResponse.Redirect),
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
              Effect.zipRight(ServerResponse.Redirect(Routes.myAccount)),
            ),
        }),
      ),
      Effect.catchTags({
        AlreadyAuthenticated: () => ServerResponse.Redirect(Routes.myAccount),
        ParseError: ServerResponse.FormError,
        EmailAlreadyInUse: ServerResponse.BadRequest,
        CookieError: () => ServerResponse.ServerError(),
        GenerateUrlError: () => ServerResponse.ServerError(),
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
