import { Password } from "@chuz/domain";
import { S } from "@chuz/prelude";
import { useActionData, useFetcher } from "@remix-run/react";
import { passwordsMatchFilter } from "src/FormSchema";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";

export type SetPasswordFormSchema = S.Schema.Type<typeof SetPasswordFormSchema>;
export const SetPasswordFormSchema = S.Struct({
  _tag: S.Literal("SetPassword"),
  password: Password.Strong,
  password2: Password.Strong,
}).pipe(passwordsMatchFilter);

export const SetPasswordForm = () => {
  const { Form, data } = useFetcher();
  const actionData = useActionData();
  return (
    <Form method="POST">
      <pre>{JSON.stringify({ data, actionData }, null, 2)}</pre>
      <Input name="_tag" type="hidden" value="SetPassword" />
      <div className="grid gap-8">
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" name="password" autoCorrect="off" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password2">Confirm password</Label>
            <Input id="password2" type="password" name="password2" autoCorrect="off" />
          </div>
        </div>
        <Button>Add password</Button>
      </div>
    </Form>
  );
};
