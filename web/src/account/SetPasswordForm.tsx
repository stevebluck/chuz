import { Form } from "@remix-run/react";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";

export const SetPasswordForm = () => {
  return (
    <Form method="POST">
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
