import { Credentials } from "@chuz/domain";
import { Effect, Match } from "@chuz/prelude";
import * as S from "@chuz/prelude/Schema";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/auth-content";
import { LoginForm } from "src/auth/login-form";
import { useActionData } from "src/hooks/useActionData";
import { Users, Session, ServerResponse } from "src/server";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
import { AppCookies } from "src/server/cookies/AppCookies";
import { Auth } from "src/server/oauth/Auth";

const SearchParams = S.struct({
  _tag: S.literal("google"),
  code: Auth.Code,
  state: Auth.State.schema,
});

type LoginFormFields = S.Schema.Type<typeof LoginFormFields>;
const LoginFormFields = S.union(
  Credentials.EmailPassword.Plain,
  S.struct({ _tag: S.literal("Provider"), provider: S.literal("google") }),
);

export const loader = Remix.loader(
  Session.guest.pipe(
    Effect.flatMap(() => AppCookies.authState),
    Effect.flatMap((stateCookie) =>
      Effect.all([stateCookie.read, ServerRequest.searchParams(SearchParams)]).pipe(
        Effect.filterOrFail(
          ([state, search]) => Auth.State.equals(state, search.state),
          () => new Auth.State.DoesNotMatch(),
        ),
        Effect.map(([, search]) => search),
        Effect.flatMap(Auth.exchangeCodeForSession),
        Effect.flatMap(Session.mint),
        Effect.flatMap(() => ServerResponse.Redirect(Routes.myAccount)),
        Effect.catchTags({
          CookieNotPresent: () => ServerResponse.Unit(),
          SearchParamsError: () => ServerResponse.Unit(),
          EmailAlreadyInUse: (e) => ServerResponse.BadRequest(e),
          CredentialsNotRecognised: (e) => ServerResponse.BadRequest(e),
          ExchangeCodeError: () => ServerResponse.ServerError("Identity provider issue"),
          StateDoesNotMatch: () => ServerResponse.ServerError("State does not match"),
        }),
        Effect.flatMap(stateCookie.remove),
      ),
    ),
    Effect.catchTag("AlreadyAuthenticated", () => ServerResponse.Redirect(Routes.myAccount)),
  ),
);

export const action = Remix.action(
  Effect.flatMap(AppCookies.authState, (stateCookie) =>
    Session.guest.pipe(
      Effect.zipRight(ServerRequest.formData(LoginFormFields)),
      Effect.flatMap(
        Match.typeTags<LoginFormFields>()({
          Provider: ({ provider }) =>
            Effect.flatMap(Auth.State.make, (state) =>
              Auth.generateAuthUrl({ _tag: provider, state }).pipe(
                Effect.flatMap(ServerResponse.Redirect),
                Effect.flatMap(stateCookie.save(state)),
              ),
            ),
          Plain: (credential) =>
            Users.authenticate(credential).pipe(
              Effect.flatMap(Session.mint),
              Effect.flatMap(() => ServerResponse.Redirect(Routes.myAccount)),
            ),
        }),
      ),
      Effect.catchTags({
        AlreadyAuthenticated: () => ServerResponse.Redirect(Routes.myAccount),
        CookieError: (e) => ServerResponse.ServerError(e.message),
        GenerateUrlError: () => ServerResponse.ServerError("Identity provider issue"),
        ParseError: ServerResponse.FormError,
        CredentialsNotRecognised: ServerResponse.BadRequest,
      }),
    ),
  ),
);

export default function LoginPage() {
  const result = useActionData();

  return (
    <AuthContent
      to={Routes.register}
      toLabel="Create an account"
      title="Sign in to your account"
      description="Lets get back to learning!"
    >
      <pre>{JSON.stringify(result, null, 2)}</pre>
      <LoginForm />
    </AuthContent>
  );
}
