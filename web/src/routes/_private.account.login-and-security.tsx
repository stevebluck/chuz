import { Password, User } from "@chuz/domain";
import { Effect, Match, Option, S, Tuple } from "@chuz/prelude";
import { useLoaderData } from "@remix-run/react";
import { ShieldIcon } from "lucide-react";
import { Routes } from "src/Routes";
import { AccountSettingsLayout } from "src/account/AccountSettingsLayout";
import { SetPasswordForm, SetPasswordFormFields } from "src/account/SetPasswordForm";
import { UpdatePasswordForm, UpdatePasswordFormFields } from "src/account/UpdatePasswordForm";
import { PreviewContent } from "src/components/PreviewContent";
import { TitledSection } from "src/components/TitledSection";
import { Card, CardDescription, CardHeader, CardTitle } from "src/components/ui/card";
import { useActiveState } from "src/hooks/useActiveState";
import { Http, Session, Users } from "src/server";
import { Hasher } from "src/server/Passwords";
import * as Remix from "src/server/Remix";

export const loader = Remix.loader(
  Session.authenticated.pipe(
    Effect.flatMap((session) => Users.identities(session.user.id)),
    Effect.flatMap((identities) =>
      Http.response.ok({
        hasPassword: Option.isSome(Tuple.getFirst(identities)),
        identities: Tuple.getSecond(identities),
      }),
    ),
    Effect.catchTags({ Unauthorised: () => Http.response.unauthorized }),
  ),
);

const forms = S.Union(UpdatePasswordFormFields, SetPasswordFormFields);
const matchForm = Match.typeTags<S.Schema.Type<typeof forms>>();

export const action = Remix.action(
  Session.authenticated.pipe(
    Effect.flatMap((session) =>
      Http.request.formData(forms).pipe(
        Effect.flatMap(
          matchForm({
            SetPasswordForm: (form) =>
              Effect.succeed(form).pipe(
                Effect.filterOrFail(
                  (form) => Password.strongEquals(form.password)(form.password2),
                  () => new Password.PasswordsDoNotMatch(),
                ),
                Effect.bind("hashed", (form) => Hasher.hash(form.password)),
                Effect.flatMap(({ hashed }) => Users.setPassword(session.token, hashed)),
                Effect.zipRight(Http.response.redirect(Routes.account.loginAndSecurity)),
                Effect.catchTags({
                  PasswordsDoNotMatch: Http.response.badRequest,
                  PasswordAlreadySet: Http.response.badRequest,
                }),
              ),
            UpdatePasswordForm: (form) =>
              Effect.succeed(form).pipe(
                Effect.filterOrFail(
                  (form) => Password.strongEquals(form.password)(form.password2),
                  () => new Password.PasswordsDoNotMatch(),
                ),
                Effect.bind("hashed", (form) => Hasher.hash(form.password)),
                Effect.flatMap(({ currentPassword, hashed }) =>
                  Users.updatePassword(session.token, currentPassword, hashed),
                ),
                Effect.zipRight(Http.response.redirect(Routes.account.loginAndSecurity)),
                Effect.catchTags({
                  CredentialNotRecognised: Http.response.badRequest,
                  PasswordsDoNotMatch: Http.response.badRequest,
                }),
              ),
          }),
        ),
      ),
    ),
    Effect.catchTags({
      InvalidFormData: Http.response.validationError,
      NoSuchToken: () => Http.response.unauthorized,
      Unauthorised: () => Http.response.unauthorized,
    }),
  ),
);

const Section = {
  updatePassword: "update-password",
} as const;

export default function LoginAndSecurity() {
  const { hasPassword } = useLoaderData<{
    hasPassword: boolean;
    socialIdentities: User.identity.Social[];
  }>();

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
