import { useLoaderData } from "@remix-run/react";
import { ShieldIcon } from "lucide-react";
import { Routes } from "src/Routes";
import { PreviewContent } from "src/components/PreviewContent";
import { TitledSection } from "src/components/TitledSection";
import { AccountSettingsLayout } from "src/components/account/AccountSettingsLayout";
import { SetPasswordForm, SetPasswordFormSchema } from "src/components/account/SetPasswordForm";
import { UpdatePasswordForm, UpdatePasswordFormSchema } from "src/components/account/UpdatePasswordForm";
import { Card, CardDescription, CardHeader, CardTitle } from "src/components/ui/card";
import { useActiveState } from "src/hooks/useActiveState";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
import { ServerResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";
import { Passwords, Users } from "@chuz/core";
import { Credential, User } from "@chuz/domain";
import { Data, Effect, Match, Predicate, S } from "@chuz/prelude";

export const loader = Remix.loader(
  Session.authenticated.pipe(
    Effect.flatMap((session) => Users.pipe(Effect.flatMap((users) => users.identities(session.user.id)))),
    Effect.flatMap(User.Identities.encode),
    Effect.map((identities) => ServerResponse.Ok(identities)),
    Effect.catchTags({
      ParseError: ServerResponse.Unexpected,
      Unauthorized: () => ServerResponse.Unauthorized,
    }),
  ),
);

const Section = {
  updatePassword: "update-password",
} as const;

export default function LoginAndSecurity() {
  const { data } = useLoaderData<typeof loader>();

  const hasPassword = Predicate.isNotNull(data.EmailPassword);

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

export const action = Remix.unwrapAction(
  Effect.gen(function* () {
    const passwords = yield* Passwords;
    const users = yield* Users;

    type Forms = S.Schema.Type<typeof Forms>;
    const Forms = S.Union(UpdatePasswordFormSchema, SetPasswordFormSchema);

    const matchForm = Match.typeTags<Forms>();

    return Effect.gen(function* () {
      const session = yield* Session.authenticated;

      const SetPassword = (form: Data.TaggedEnum.Value<Forms, "SetPassword">) =>
        Effect.succeed(form.password).pipe(
          Effect.flatMap(passwords.hash),
          Effect.map((password) => Credential.Secure.EmailPassword({ email: session.user.value.email, password })),
          Effect.flatMap((credential) => users.linkCredential(session.token, credential)),
        );

      const UpdatePassword = (form: Data.TaggedEnum.Value<Forms, "UpdatePassword">) =>
        Effect.succeed(form.password).pipe(
          Effect.flatMap(passwords.hash),
          Effect.flatMap((password) => users.updatePassword(session.token, form.currentPassword, password)),
        );

      return yield* ServerRequest.formData(Forms).pipe(
        Effect.flatMap(matchForm({ SetPassword, UpdatePassword })),
        Effect.flatMap(() => ServerResponse.Redirect(Routes.account.loginAndSecurity)),
        Effect.catchTags({
          CredentialAlreadyInUse: () => ServerResponse.FormRootError("Those credentials are already in use"),
          CredentialNotRecognised: () => ServerResponse.FormRootError("Your current password is incorrect"),
          NoSuchToken: () => ServerResponse.Unauthorized,
        }),
      );
    });
  }),
);
