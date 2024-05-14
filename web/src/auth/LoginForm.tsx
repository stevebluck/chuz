import { Credential, Email, Password } from "@chuz/domain";
import { S } from "@chuz/prelude";
import { LoaderIcon } from "lucide-react";
import { Routes } from "src/Routes";
import { Link } from "src/components/Link";
import { Button } from "src/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/components/ui/form";
import { Input } from "src/components/ui/input";
import { useForm } from "src/hooks/useForm";

export const LoginFormSchema = S.Struct({
  _tag: S.Literal(Credential.Tag.EmailPassword),
  email: Email.pipe(S.message(() => "Invalid email address")),
  password: Password.Plaintext.pipe(S.message(() => "Your password is required")),
});

export function LoginForm() {
  const form = useForm(LoginFormSchema, {
    action: Routes.login,
    method: "post",
    preventScrollReset: false,
    defaultValues: {
      _tag: Credential.Tag.EmailPassword,
      email: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <FormField
        name="_tag"
        control={form.control}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input {...field} type="hidden" readOnly />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-6">
        <FormField
          name="email"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  disabled={form.isSubmitting}
                  placeholder="name@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="password"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="name@example.com" disabled={form.isSubmitting} {...field} />
              </FormControl>
              <FormDescription>
                <Link to={Routes.forgotPassword} className="inline-block text-sm underline hover:text-primary">
                  Forgot your password?
                </Link>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">
          {form.isSubmitting && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
          Sign in with Email
        </Button>
      </div>
    </Form>
  );
}
