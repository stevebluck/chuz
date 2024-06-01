import { useLoaderData } from "@remix-run/react";
import { ShieldIcon } from "lucide-react";
import { Routes } from "src/Routes";
import { PreviewContent } from "src/components/PreviewContent";
import { TitledSection } from "src/components/TitledSection";
import { AccountSettingsLayout } from "src/components/account/AccountSettingsLayout";
import { SetPasswordForm, SetPasswordFormSchema } from "src/components/account/SetPasswordForm";
import { UpdatePasswordForm, UpdatePasswordFormSchema } from "src/components/account/UpdatePasswordForm";
import { Button } from "src/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "src/components/ui/card";
import { AppleIcon } from "src/components/ui/icons/AppleIcon";
import { GoogleIcon } from "src/components/ui/icons/GoogleIcon";
import { useActiveState } from "src/hooks/useActiveState";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
import { ServerResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";
import { Passwords, Users } from "@chuz/core";
import { Credential, User } from "@chuz/domain";
import { Data, Effect, Predicate, S } from "@chuz/prelude";

export const loader = Remix.unwrapLoader(
  Effect.gen(function* () {
    const users = yield* Users;

    return Session.authenticated.pipe(
      Effect.flatMap((session) => users.identities(session.user.id)),
      Effect.flatMap(User.Identities.encode),
      Effect.map((identities) => ({ identities, hasPassword: Predicate.isNotNull(identities.EmailPassword) })),
      Effect.map(ServerResponse.Ok),
      Effect.catchTags({
        ParseError: ServerResponse.Unexpected,
        Unauthorized: () => ServerResponse.Unauthorized,
      }),
    );
  }),
);

const Section = {
  updatePassword: "update-password",
} as const;

export default function LoginAndSecurity() {
  const { data } = useLoaderData<typeof loader>();

  const { isActive, isOtherActive } = useActiveState(Section);

  return (
    <AccountSettingsLayout title="Login & security">
      <div className="flex-1 flex flex-col gap-10 border-t pt-10">
        <TitledSection title="Login">
          <PreviewContent
            title="Password"
            activateButtonLabel={data.hasPassword ? "Update" : "Add"}
            isActive={isActive(Section.updatePassword)}
            isDisabled={isOtherActive(Section.updatePassword)}
            activateRoute={Routes.account.loginAndSecurityError(Section.updatePassword)}
            cancelRoute={Routes.account.loginAndSecurity}
            preview={
              <p className="text-muted-foreground">
                {data.hasPassword ? "Password last updated (TBC)" : "No password is currently set"}
              </p>
            }
          >
            {data.hasPassword ? <UpdatePasswordForm /> : <SetPasswordForm />}
          </PreviewContent>
        </TitledSection>
        <TitledSection title="Social accounts">
          <ul className="grid gap-6">
            <li className="flex gap-2 justify-between items-start">
              <div className="flex gap-2">
                <GoogleIcon className="w-6 h-6 mt-1" />
                <div>
                  <div className="font-medium">Google</div>
                  <div className="text-muted-foreground text-sm">
                    {data.identities.Google ? data.identities.Google.email : "No Google account linked"}
                  </div>
                </div>
              </div>
              <Button variant="link">{data.identities.Google ? "Unlink" : "Link"}</Button>
            </li>
            <li className="border-t" />
            <li className="flex gap-2 justify-between items-start">
              <div className="flex gap-2">
                <AppleIcon className="w-6 h-6" />
                <div>
                  <div className="font-medium">Apple</div>
                  <div className="text-muted-foreground text-sm">
                    {data.identities.Apple ? data.identities.Apple.email : "No Apple account linked"}
                  </div>
                </div>
              </div>
              <Button variant="link">{data.identities.Apple ? "Unlink" : "Link"}</Button>
            </li>
          </ul>
        </TitledSection>
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

    const { $match: matchForm } = Data.taggedEnum<Forms>();

    return Effect.gen(function* () {
      const session = yield* Session.authenticated;

      const SetPassword = (form: Data.TaggedEnum.Value<Forms, "SetPassword">) =>
        passwords.hash(form.password).pipe(
          Effect.map((password) => Credential.Secure.EmailPassword({ email: session.user.value.email, password })),
          Effect.flatMap((credential) => users.linkCredential(session.token, credential)),
        );

      const UpdatePassword = (form: Data.TaggedEnum.Value<Forms, "UpdatePassword">) =>
        passwords
          .hash(form.password)
          .pipe(Effect.flatMap((password) => users.updatePassword(session.token, form.currentPassword, password)));

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
