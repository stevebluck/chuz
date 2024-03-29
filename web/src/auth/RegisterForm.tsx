import { Form } from "@remix-run/react";
import { LoaderIcon } from "lucide-react";
import { Checkbox } from "src/components/ui/checkbox";
import { Routes } from "web/Routes";
import { Button } from "web/components/ui/button";
import { Input } from "web/components/ui/input";
import { Label } from "web/components/ui/label";
import { AuthSocialButtons } from "./SocialButtons";

export function RegisterForm({ error }: { error: Record<string, string[]> }) {
  const isSubmitting = false;
  return (
    <div className={"grid gap-6"}>
      <Form method="POST" action={Routes.register}>
        <Input name="_tag" type="hidden" value="Strong" />
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
            {error?.email}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="firstname">First name</Label>
            <Input id="firstname" type="text" name="firstName" disabled={isSubmitting} />
            {error?.firstName}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastname">Last name</Label>
            <Input id="lastname" type="text" name="lastName" disabled={isSubmitting} />
            {error?.lastName}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" name="password" disabled={isSubmitting} />
            {error?.password}
          </div>
          <div className="grid gap-2">
            <div className="items-top flex space-x-2">
              <Checkbox id="optInMarketing" name="optInMarketing" />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="optInMarketing"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Opt in to marketing emails
                </label>
                <p className="text-sm text-muted-foreground">We won't send you any crap.</p>
                {error?.optInMarketing}
              </div>
            </div>
          </div>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
            Sign up with Email
          </Button>
        </div>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">Or sign up with</span>
        </div>
      </div>
      <AuthSocialButtons disabled={isSubmitting} action={Routes.register} />
    </div>
  );
}
