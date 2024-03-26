import { Credential } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { Data, Effect, Match } from "effect";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/auth-layout";
import { LoginForm } from "src/auth/login-form";
import { useActionData } from "src/hooks/useActionData";
import { Users, Session, ServerResponse } from "src/server";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
import { AppCookies } from "src/server/cookies/AppCookies";
import { Auth } from "src/server/oauth/Auth";

type Form = S.Schema.Type<typeof Form>;
const Form = S.union(
  Credential.EmailPassword.Plain,
  S.struct({ _tag: S.literal("Provider"), provider: S.literal("google") }),
);

const matcher = Match.typeTags<Form>();

const loginAction = Effect.gen(function* (_) {
  const stateCookie = yield* _(AppCookies.authState);
  const formData = yield* _(ServerRequest.formData(Form));

  const match = matcher({
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
  });

  return yield* _(match(formData));
}).pipe(
  Effect.catchTags({
    CookieError: () => ServerResponse.Ok(),
    GenerateUrlError: () => ServerResponse.ValidationError({ email: ["OAuth2 provider failed"] }),
    FormDataError: ({ error }) => ServerResponse.ValidationError(error),
    CredentialsNotRecognised: () => ServerResponse.ValidationError({ email: ["Invalid email or password"] }),
  }),
);

export const action = Remix.action(loginAction);

const SearchParams = S.struct({
  _tag: S.literal("google"),
  code: Auth.Code,
  state: Auth.State.schema,
});

class StateDoesNotMatch extends Data.TaggedError("StateDoesNotMatch") {}

const loginLoader = Effect.flatMap(AppCookies.authState, (stateCookie) =>
  Effect.gen(function* (_) {
    const state = yield* _(stateCookie.read);
    const search = yield* _(ServerRequest.searchParams(SearchParams));

    if (!stateCookie.equals(state, search.state)) {
      yield* _(new StateDoesNotMatch());
    }

    const session = yield* _(Auth.exchangeCodeForSession(search));

    yield* _(Session.mint(session));

    return yield* _(ServerResponse.Redirect(Routes.myAccount));
  }).pipe(
    Effect.catchTags({
      CookieNotPresent: () => ServerResponse.Ok(),
      SearchParamsError: () => ServerResponse.Ok(),
      ExchangeCodeError: () =>
        ServerResponse.ValidationError({
          state: ["Something went wrong with the identity provider"],
        }),
      StateDoesNotMatch: () =>
        ServerResponse.ValidationError({
          state: ["Invalid state"],
        }),
      EmailAlreadyInUse: () =>
        ServerResponse.ValidationError({
          email: ["You already have an account"],
        }),
      CredentialsNotRecognised: () =>
        ServerResponse.ValidationError({
          email: ["Invalid email or password"],
        }),
    }),
    Effect.flatMap(stateCookie.remove),
  ),
);

export const loader = Remix.loader(loginLoader);

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
