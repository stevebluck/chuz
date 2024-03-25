import { Credentials } from "@chuz/domain";
import { Uuid } from "@chuz/prelude";
import * as S from "@effect/schema/Schema";
import { Data, Effect, Match } from "effect";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/auth-layout";
import { LoginForm } from "src/auth/login-form";
import { useActionData } from "src/hooks/useActionData";
import { Users, Session, ServerResponse } from "src/server";
import { IdentityProvider } from "src/server/IdentityProvider";
import { OAuth } from "src/server/OAuth";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
import { Cookie } from "src/server/cookies/Cookie";

const stateCookie = new Cookie("state", Uuid.schema, {
  path: "/",
  maxAge: "10 minutes",
  secret: "test",
  httpOnly: true,
});

type LoginFormFields = S.Schema.Type<typeof LoginFormFields>;
const LoginFormFields = S.union(
  Credentials.EmailPassword.Plain,
  S.struct({
    _tag: S.literal("Provider"),
    provider: S.literal("google"),
  }),
);

const match = Match.typeTags<LoginFormFields>();

export const action = Remix.action(
  ServerRequest.formData(LoginFormFields).pipe(
    Effect.flatMap(
      match({
        Provider: ({ provider }) =>
          Effect.flatMap(Uuid.make, (state) =>
            OAuth.generateAuthUrl(provider, state).pipe(
              Effect.flatMap(ServerResponse.Redirect),
              Effect.flatMap(stateCookie.save(state)),
            ),
          ),
        Plain: (credential) =>
          Users.authenticate(credential).pipe(
            Effect.tap(Session.mint),
            Effect.flatMap(() => ServerResponse.Redirect(Routes.myAccount)),
          ),
      }),
    ),
    Effect.catchTags({
      CookieError: () => ServerResponse.Ok(),
      FormDataError: ({ error }) => ServerResponse.ValidationError(error),
      CredentialsNotRecognised: () => ServerResponse.ValidationError({ email: ["Invalid email or password"] }),
      EmailAlreadyInUse: () => ServerResponse.ValidationError({ email: ["Email already in use"] }),
    }),
  ),
);

const SearchParams = S.struct({
  code: IdentityProvider.AuthCode,
  provider: S.literal("google"),
  state: Uuid.schema,
});

class StateDoesNotMatch extends Data.TaggedError("StateDoesNotMatch") {}

export const loader = Remix.loader(
  Effect.all([stateCookie.read, ServerRequest.searchParams(SearchParams)]).pipe(
    Effect.filterOrFail(
      ([state, search]) => stateCookie.equals(state, search.state),
      () => new StateDoesNotMatch(),
    ),
    Effect.flatMap(([_, search]) => OAuth.exchangeCodeForSession({ code: search.code, _tag: search.provider })),
    Effect.tap(Session.mint),
    Effect.flatMap(() => ServerResponse.Redirect(Routes.myAccount)),
    Effect.catchTags({
      ExchangeCodeError: () => ServerResponse.Ok(),
      CookieNotPresent: () => ServerResponse.Ok(),
      SearchParamsError: () => ServerResponse.ValidationError({ state: ["Invalid state"] }),
      StateDoesNotMatch: () => ServerResponse.ValidationError({ state: ["Invalid state"] }),
      EmailAlreadyInUse: () => ServerResponse.ValidationError({ email: ["Email already in use"] }),
    }),
    Effect.flatMap(stateCookie.remove),
  ),
);

export default function LoginPage() {
  const data = useActionData();

  return (
    <AuthContent
      to={Routes.register}
      toLabel="Create an account"
      title="Sign in to your account"
      description="Lets get back to learning!"
    >
      <LoginForm />
    </AuthContent>
  );
}
