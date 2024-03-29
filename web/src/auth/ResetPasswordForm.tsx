import { Form } from "@remix-run/react";
import { LoaderIcon } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Routes } from "web/Routes";
import { Input } from "web/components/ui/input";
import { Label } from "web/components/ui/label";

interface Props {
  token: string;
}

export const ResetPasswordForm = ({ token }: Props) => {
  const isSubmitting = false;
  return (
    <div className="grid gap-6">
      <Form method="POST" action={Routes.resetPassword(token)}>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">Password</Label>
            <Input id="password" name="password" type="password" disabled={isSubmitting} />
          </div>

          <Button disabled={isSubmitting} type="submit">
            {isSubmitting && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
            Reset
          </Button>
        </div>
      </Form>
    </div>
  );
};
