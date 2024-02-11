import { LoaderIcon } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { AppleIcon } from "~/components/ui/icons/AppleIcon";
import { GoogleIcon } from "~/components/ui/icons/GoogleIcon";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function LoginForm() {
  const [isLoading] = React.useState<boolean>(false);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
  }

  return (
    <div className={"grid gap-6"}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoCorrect="off" disabled={isLoading} />
          </div>
          <Button disabled={isLoading}>
            {isLoading && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
            Sign In with Email
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">Or sign in with</span>
        </div>
      </div>
      <Button variant="outline" type="button" disabled={isLoading}>
        <AppleIcon className="mr-2 h-5 w-5 dark:fill-white" />
        Apple
      </Button>
      <Button variant="outline" type="button" disabled={isLoading}>
        <GoogleIcon className="mr-2 h-4 w-4" />
        Google
      </Button>
    </div>
  );
}
