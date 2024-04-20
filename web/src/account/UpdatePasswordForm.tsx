import { Password } from "@chuz/domain";
import { S } from "@chuz/prelude";
import { Form } from "@remix-run/react";
import { Routes } from "src/Routes";
import { Link } from "src/components/Link";
import { Button, buttonVariants } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { cn } from "src/styles/classnames";

export const UpdatePasswordFormFields = S.taggedStruct("UpdatePasswordForm", {
  currentPassword: Password.Plaintext,
  password: Password.Strong,
  password2: Password.Strong,
});

export const UpdatePasswordForm = () => {
  return (
    <Form method="POST">
      <div className="grid gap-8">
        <div className="grid gap-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" name="currentPassword" type="password" />
          <div>
            <Link to={Routes.forgotPassword} className={cn(buttonVariants({ variant: "link" }), "text-sm")}>
              Need a new password?
            </Link>
          </div>
        </div>
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
        <Button>Update password</Button>
      </div>
    </Form>
  );
};
