import { Passwords, PasswordsDoNotMatch, Users } from "@chuz/core";
import { Credential, Password, User } from "@chuz/domain";
import { Data, Effect, Equal, Match, Option, S } from "@chuz/prelude";
import { ShieldIcon } from "lucide-react";
import { Routes } from "src/Routes";
import { AccountSettingsLayout } from "src/account/AccountSettingsLayout";
import { SetPasswordForm } from "src/account/SetPasswordForm";
import { UpdatePasswordForm } from "src/account/UpdatePasswordForm";
import { PreviewContent } from "src/components/PreviewContent";
import { TitledSection } from "src/components/TitledSection";
import { Card, CardDescription, CardHeader, CardTitle } from "src/components/ui/card";
import { useActiveState } from "src/hooks/useActiveState";
import { useLoaderData } from "src/hooks/useLoaderData";
import * as Remix from "src/server/Remix";
import * as ServerRequest from "src/server/ServerRequest";
import { ActionResponse, LoaderResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";

export const loader = Remix.loader(
  Session.authenticated.pipe(
    Effect.flatMap((session) => Users.pipe(Effect.flatMap((users) => users.identities(session.user.id)))),
    Effect.flatMap(User.Identities.encode),
    Effect.map((identities) => LoaderResponse.Succeed(identities)),
    Effect.catchAll(() => LoaderResponse.Unauthorized),
  ),
);

type Forms = S.Schema.Type<typeof Forms>;
const Forms = S.Union(
  S.Struct({
    _tag: S.Literal("UpdatePassword"),
    currentPassword: Password.Plaintext,
    password: Password.Strong,
    password2: Password.Strong,
  }),
  S.Struct({
    _tag: S.Literal("SetPassword"),
    password: Password.Strong,
    password2: Password.Strong,
  }),
);

export const action = Remix.unwrapAction(
  Effect.gen(function* () {
    const passwords = yield* Passwords;
    const users = yield* Users;

    const match = Match.typeTags<Forms>();

    return Effect.gen(function* () {
      const session = yield* Session.authenticated;

      const SetPassword = (form: Data.TaggedEnum.Value<Forms, "SetPassword">) =>
        Effect.succeed(form.password).pipe(
          Effect.filterOrFail(Equal.equals(form.password2), () => new PasswordsDoNotMatch()),
          Effect.flatMap(passwords.hash),
          Effect.map((password) => Credential.Secure.EmailPassword({ email: session.user.value.email, password })),
          Effect.flatMap((credential) => users.linkCredential(session.token, credential)),
          Effect.map(() => ActionResponse.Redirect(Routes.account.loginAndSecurity)),
        );

      const UpdatePassword = (form: Data.TaggedEnum.Value<Forms, "UpdatePassword">) =>
        Effect.succeed(form.password).pipe(
          Effect.filterOrFail(Equal.equals(form.password2), () => new PasswordsDoNotMatch()),
          Effect.flatMap(passwords.hash),
          Effect.flatMap((password) => users.updatePassword(session.token, form.currentPassword, password)),
          Effect.map(() => ActionResponse.Redirect(Routes.account.loginAndSecurity)),
        );

      return yield* ServerRequest.formData(Forms).pipe(
        Effect.flatMap(match({ SetPassword, UpdatePassword })),
        Effect.map(() => ActionResponse.Redirect(Routes.account.loginAndSecurity)),
        Effect.catchAll(ActionResponse.Unexpected),
      );
    });
  }),
);

const Section = {
  updatePassword: "update-password",
} as const;

export default function LoginAndSecurity() {
  const identities = useLoaderData(User.Identities);

  const hasPassword = Option.isSome(identities.EmailPassword);

  const { isActive, isOtherActive } = useActiveState(Section);

  return (
    <AccountSettingsLayout title="Login & security">
      <div className="flex-1 flex flex-col gap-10 border-t pt-10">
        <TitledSection title="Login">
          <PreviewContent
            title="Password"
            activateButtonLabel={hasPassword ? "Update" : "Add"}
            isActive={isActive(Section.updatePassword)}
            isDisabled={isOtherActive(Section.updatePassword)}
            activateRoute={Routes.account.loginAndSecurityError(Section.updatePassword)}
            cancelRoute={Routes.account.loginAndSecurity}
            preview={
              <p className="text-muted-foreground">
                {hasPassword ? "Password last updated (TBC)" : "No password is currently set"}
              </p>
            }
          >
            {hasPassword ? <UpdatePasswordForm /> : <SetPasswordForm />}
          </PreviewContent>
        </TitledSection>
        <TitledSection title="Social accounts">...</TitledSection>
        <TitledSection title="Device history">...</TitledSection>
      </div>
      <aside className="md:max-w-80 w-full">
        <Card>
          <CardHeader>
            <div className="pb-8">
              <ShieldIcon />
            </div>
            <CardTitle className="text-base">Keeping your account secure</CardTitle>
            <CardDescription>Protect your account with a strong password and unique email address.</CardDescription>
          </CardHeader>
        </Card>
      </aside>
    </AccountSettingsLayout>
  );
}
