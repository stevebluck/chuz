import { Credential, Email, OAuth, Password, User } from "@chuz/domain";
import { Effect, Match, S } from "@chuz/prelude";
import { Passwords, Users } from "core/index";
import { fromCheckboxInput, optionalTextInput } from "src/FormSchema";
import { Cookies, Http } from "./prelude";

// TODO: put these pack in their routes

export const generateAuthUrl = (provider: OAuth.Provider, intent: OAuth.Intent) =>
  Effect.gen(function* () {
    const cookie = yield* Cookies.AuthState;
    const users = yield* Users;
    const state = yield* OAuth.State.make(provider, intent);
    const url = yield* users.generateAuthUrl(state);

    return yield* Effect.flatMap(Http.response.redirect(url), cookie.set(state));
  });

// TODO: I think I need to Passwords.validate -> ValidatedPassword here
export const loginByEmail = (form: EmailLoginForm) =>
  Users.pipe(
    Effect.flatMap((users) =>
      users.authenticate(Credential.Plain.Email({ email: form.email, password: form.password })),
    ),
  );

export const registerByEmail = (form: EmailRegistrationFrom) =>
  Credential.EmailPassword.Strong.make(form.email, form.password).pipe(
    Effect.flatMap((credential) =>
      Passwords.pipe(
        Effect.flatMap((passwords) => passwords.hash(credential.password)),
        Effect.map((password) => Credential.Secure.Email({ email: credential.email, password })),
        Effect.flatMap((credential) =>
          Users.pipe(
            Effect.flatMap((users) =>
              users.register({
                credential,
                firstName: form.firstName,
                lastName: form.lastName,
                optInMarketing: form.optInMarketing,
              }),
            ),
          ),
        ),
      ),
    ),
  );

export type EmailLoginForm = S.Schema.Type<typeof EmailLoginForm>;
export const EmailLoginForm = S.Struct({
  _tag: S.Literal(Credential.ProviderId.Email),
  email: Email,
  password: Password.Plaintext,
});

export type LoginFormFields = S.Schema.Type<typeof LoginFormFields>;
export const LoginFormFields = S.Union(
  EmailLoginForm,
  S.Struct({ _tag: S.Literal(Credential.ProviderId.Google) }),
  S.Struct({ _tag: S.Literal(Credential.ProviderId.Apple) }),
);

export type EmailRegistrationFrom = S.Schema.Type<typeof EmailRegistrationFrom>;
export const EmailRegistrationFrom = S.Struct({
  _tag: S.Literal(Credential.ProviderId.Email),
  email: Email,
  password: Password.Strong,
  firstName: optionalTextInput(User.FirstName),
  lastName: optionalTextInput(User.LastName),
  optInMarketing: fromCheckboxInput(User.OptInMarketing),
});

export type RegisterFormFields = S.Schema.Type<typeof RegisterFormFields>;
export const RegisterFormFields = S.Union(
  EmailRegistrationFrom,
  S.Struct({ _tag: S.Literal(Credential.ProviderId.Google) }),
  S.Struct({ _tag: S.Literal(Credential.ProviderId.Apple) }),
);

export const matchRegistrationFrom = Match.typeTags<RegisterFormFields>();

export const matchLoginForm = Match.typeTags<LoginFormFields>();
