import { User } from "@chuz/domain";
import { Effect, Option, ReadonlyArray } from "@chuz/prelude";
import { useLoaderData } from "@remix-run/react";
import { ShieldIcon } from "lucide-react";
import { Routes } from "src/Routes";
import { AccountSettingsLayout } from "src/account/AccountSettingsLayout";
import { AddPasswordForm } from "src/account/AddPasswordForm";
import { UpdatePasswordForm } from "src/account/UpdatePasswordForm";
import { PreviewContent } from "src/components/PreviewContent";
import { TitledSection } from "src/components/TitledSection";
import { Card, CardDescription, CardHeader, CardTitle } from "src/components/ui/card";
import { useActiveState } from "src/hooks/useActiveState";
import { Http, Session, Users } from "src/server";
import * as Remix from "src/server/Remix";

export const loader = Remix.loader(
  Session.authenticated.pipe(
    Effect.flatMap((session) => Users.findIdentitiesById(session.user.id)),
    Effect.flatMap(Http.response.ok),
    Effect.catchTags({
      UserNotFound: () => Http.response.unauthorized,
      Unauthorised: () => Http.response.unauthorized,
    }),
  ),
);

export const action = Remix.action(Http.response.redirect(Routes.account.loginAndSecurity));

const Section = {
  updatePassword: "update-password",
} as const;

export default function LoginAndSecurity() {
  const identities = useLoaderData<Array<User.identity.Identity>>();
  const hasPassword = ReadonlyArray.findFirst(identities, User.identity.isEmail).pipe(Option.isSome);

  const { isActive, setActive, isOtherActive } = useActiveState(Section);

  return (
    <AccountSettingsLayout title="Login & security">
      <div className="flex-1 flex flex-col gap-10 border-t pt-10">
        <TitledSection title="Login">
          <PreviewContent
            title="Password"
            activateButtonLabel={hasPassword ? "Update" : "Add"}
            isActive={isActive(Section.updatePassword)}
            isDisabled={isOtherActive(Section.updatePassword)}
            onActivate={() => setActive(Section.updatePassword, true)}
            onCancel={() => setActive(Section.updatePassword, false)}
            preview={
              hasPassword ? (
                <p className="text-muted-foreground">*********</p>
              ) : (
                <p className="text-muted-foreground">No password is currently set</p>
              )
            }
          >
            {hasPassword ? <UpdatePasswordForm /> : <AddPasswordForm />}
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
