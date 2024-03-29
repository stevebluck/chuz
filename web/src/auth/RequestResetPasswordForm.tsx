import { Form } from "@remix-run/react";
import { LoaderIcon } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Routes } from "web/Routes";
import { Input } from "web/components/ui/input";
import { Label } from "web/components/ui/label";

export const RequestResetPasswordForm = () => {
  const isSubmitting = false;
  return (
    <div className="grid gap-6">
      <Form method="POST" action={Routes.forgotPassword}>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isSubmitting}
            />
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
