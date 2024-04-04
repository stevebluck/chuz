import { Credentials, Password, User } from "@chuz/domain";
import { Effect, Match, Option, ReadonlyArray, S } from "@chuz/prelude";
import { Form, useLoaderData } from "@remix-run/react";
import { Routes } from "src/Routes";
import { Button } from "src/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "src/components/ui/card";
import { AppleIcon } from "src/components/ui/icons/AppleIcon";
import { GoogleIcon } from "src/components/ui/icons/GoogleIcon";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { useActionData } from "src/hooks/useActionData";
import { Http, Session, Users } from "src/server";
import { Hasher } from "src/server/Passwords";
import * as Remix from "src/server/Remix";

type FormFields = S.Schema.Type<typeof FormFields>;
const FormFields = S.union(
  S.struct({
    _tag: S.literal("AddEmailCredential"),
    email: S.EmailAddress,
    password: Password.Strong,
  }),
  S.struct({
    _tag: S.literal("RemoveEmailCredential"),
    email: S.EmailAddress,
  }),
);

const match = Match.typeTags<FormFields>();

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

export const action = Remix.action(
  Effect.flatMap(Session.authenticated, (session) =>
    Http.request.formData(FormFields).pipe(
      Effect.flatMap(
        match({
          AddEmailCredential: (input) =>
            Hasher.hash(input.password).pipe(
              Effect.map((hashed) => new Credentials.EmailPassword.Secure({ email: input.email, password: hashed })),
              Effect.flatMap((cred) => Users.addIdentity(session.user.id, cred)),
            ),
          RemoveEmailCredential: ({ email }) => Users.removeIdentity(session.user.id, User.identity.Email({ email })),
        }),
      ),
    ),
  ).pipe(
    Effect.flatMap(Http.response.ok),
    Effect.catchTags({
      LastCredentialError: Http.response.badRequest,
      UserNotFound: () => Http.response.unauthorized,
      CredentialInUse: Http.response.badRequest,
      InvalidFormData: Http.response.validationError,
      Unauthorised: () => Http.response.unauthorized,
    }),
  ),
);

export default function Authentication() {
  const identities = useLoaderData<Array<User.identity.Identity>>();
  const data = useActionData();
  const emailIdentity = ReadonlyArray.findFirst(identities, User.identity.isEmail);

  return (
    <div className="grid gap-6">
      {identities && <pre>{JSON.stringify(identities, null, 2)}</pre>}
      <Card>
        <CardHeader>
          <CardTitle>Email & password</CardTitle>
          <CardDescription>
            {Option.match(emailIdentity, {
              onNone: () => "Set an email and password to sign in.",
              onSome: () => "Change your email and password.",
            })}
          </CardDescription>
        </CardHeader>
        <Form method="POST" action={Routes.authentication}>
          <CardContent className="flex flex-col gap-4">
            {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={emailIdentity.pipe(
                  Option.map((identity) => identity.email),
                  Option.getOrElse(() => ""),
                )}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder={emailIdentity.pipe(
                  Option.map(() => "********"),
                  Option.getOrElse(() => ""),
                )}
                autoCorrect="off"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            {Option.match(emailIdentity, {
              onNone: () => (
                <div>
                  <Input type="hidden" name="_tag" value="AddEmailCredential" />
                  <Button>Save email and password</Button>
                </div>
              ),
              onSome: () => (
                <div>
                  <Input type="hidden" name="_tag" value="RemoveEmailCredential" />
                  <Button variant="destructive">Remove email and password</Button>
                </div>
              ),
            })}
          </CardFooter>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Other sign in methods</CardTitle>
          <CardDescription>A list of social accounts you can use to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4">
            <ul>
              {identities.map(
                User.identity.match({
                  Email: () => null,
                  Social: ({ email, provider }) => (
                    <li className="border p-2 rounded-md shadow-sm">
                      {provider === "google" && (
                        <div className="flex gap-2 items-center">
                          <GoogleIcon className="w-4" /> {email}
                        </div>
                      )}
                      {provider === "apple" && (
                        <div className="flex items-center">
                          <AppleIcon className="w-4" /> {email}
                        </div>
                      )}
                    </li>
                  ),
                }),
              )}
            </ul>
          </form>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 gap-4">
          <Button variant="outline" className="flex items-center gap-2">
            <GoogleIcon className="w-4" /> Add a Google account
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <AppleIcon className="w-5" /> Add an Apple account
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
