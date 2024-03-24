import { Form } from "@remix-run/react";
import { LoaderIcon } from "lucide-react";
import { Routes } from "web/Routes";
import { Button } from "web/components/ui/button";
import { AppleIcon } from "web/components/ui/icons/AppleIcon";
import { GoogleIcon } from "web/components/ui/icons/GoogleIcon";
import { Input } from "web/components/ui/input";
import { Label } from "web/components/ui/label";

export function LoginForm() {
  const isSubmitting = false;
  return (
    <div className={"grid gap-6"}>
      <Form method="POST" action={Routes.login}>
        <Input name="_tag" type="hidden" value="Plain" />

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
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" name="password" autoCorrect="off" disabled={isSubmitting} />
          </div>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
            Sign in with Email
          </Button>
        </div>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">Or sign in with</span>
        </div>
      </div>
      <Button variant="outline" type="button" disabled={isSubmitting}>
        <AppleIcon className="mr-2 h-5 w-5 dark:fill-white" />
        Apple
      </Button>
      <Form method="POST" action={Routes.login} className="flex flex-col">
        <Input name="_tag" type="hidden" value="Provider" />
        <Input name="provider" type="hidden" value="google" />
        <Button variant="outline" disabled={isSubmitting}>
          <GoogleIcon className="mr-2 h-4 w-4" />
          Google
        </Button>
      </Form>
    </div>
  );
}
