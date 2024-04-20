import { Form } from "@remix-run/react";
import { Route } from "src/Routes";
import { Button } from "src/components/ui/button";
import { AppleIcon } from "src/components/ui/icons/AppleIcon";
import { GoogleIcon } from "src/components/ui/icons/GoogleIcon";
import { Input } from "src/components/ui/input";

interface Props {
  disabled: boolean;
  action: Route;
}

export const AuthSocialButtons = ({ disabled, action }: Props) => {
  return (
    <div className="grid gap-6">
      <Form method="POST" action={action} className="flex flex-col">
        <Input name="_tag" type="hidden" value="Provider" />
        <Input name="provider" type="hidden" value="google" />
        <Button variant="secondary" disabled={disabled}>
          <GoogleIcon className="mr-2 h-4 w-4" />
          Google
        </Button>
      </Form>
      <Form method="POST" action={action} className="flex flex-col">
        <Input name="_tag" type="hidden" value="Provider" />
        <Input name="provider" type="hidden" value="apple" />
        <Button variant="secondary" disabled={disabled}>
          <AppleIcon className="mr-2 h-5 w-5 dark:fill-white" />
          Apple
        </Button>
      </Form>
    </div>
  );
};
