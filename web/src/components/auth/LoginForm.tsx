import { Password } from "@chuz/domain";
import { S } from "@chuz/prelude";
import { LoaderIcon } from "lucide-react";
import { Email } from "src/FormSchema";
import { Routes } from "src/Routes";
import { HiddenField } from "src/components/HiddenField";
import { InputField } from "src/components/InputField";
import { Link } from "src/components/Link";
import { Button } from "src/components/ui/button";
import { Form } from "src/components/ui/form";
import { useForm } from "src/hooks/useForm";

export const LoginFormSchema = S.Struct({
  _tag: S.Literal("LoginForm"),
  email: Email,
  password: Password.Plaintext.pipe(S.message(() => "Your password is required")),
});

export function LoginForm() {
  const form = useForm(LoginFormSchema, {
    action: Routes.login,
    method: "post",
    preventScrollReset: false,
    defaultValues: {
      _tag: "LoginForm" as const,
      email: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <HiddenField name="_tag" control={form.control} />

      <InputField
        label="Email"
        name="email"
        type="email"
        disabled={form.isSubmitting}
        control={form.control}
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect="off"
      />

      <InputField
        label="Password"
        name="password"
        type="password"
        description={
          <Link to={Routes.forgotPassword} className="inline-block text-sm underline hover:text-primary">
            Forgot your password?
          </Link>
        }
        disabled={form.isSubmitting}
        control={form.control}
      />

      <Button type="submit">
        {form.isSubmitting && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
        Sign in with Email
      </Button>
    </Form>
  );
}
