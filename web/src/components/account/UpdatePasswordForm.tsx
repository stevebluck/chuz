import { Password } from "@chuz/domain";
import { S } from "@chuz/prelude";
import { passwordsMatchFilter } from "src/FormSchema";
import { Routes } from "src/Routes";
import { HiddenField } from "src/components/HiddenField";
import { InputField } from "src/components/InputField";
import { Link } from "src/components/Link";
import { Button, buttonVariants } from "src/components/ui/button";
import { Form } from "src/components/ui/form";
import { useForm } from "src/hooks/useForm";
import { cn } from "src/styles/classnames";

export const UpdatePasswordFormSchema = S.Struct({
  _tag: S.Literal("UpdatePassword"),
  currentPassword: Password.Plaintext,
  password: Password.Strong,
  password2: Password.Strong,
}).pipe(passwordsMatchFilter);

export const UpdatePasswordForm = () => {
  const form = useForm(UpdatePasswordFormSchema, {
    action: Routes.account.loginAndSecurity,
    method: "post",
    preventScrollReset: true,
    defaultValues: {
      _tag: "UpdatePassword" as const,
      currentPassword: "",
      password: "",
      password2: "",
    },
  });

  return (
    <Form {...form}>
      <HiddenField name="_tag" type="hidden" control={form.control} />

      <InputField
        label="Current password"
        name="currentPassword"
        type="password"
        description={
          <Link to={Routes.forgotPassword} className={cn(buttonVariants({ variant: "link" }), "text-sm")}>
            Need a new password?
          </Link>
        }
        disabled={form.isSubmitting}
        control={form.control}
      />

      <InputField
        label="New password"
        name="password"
        type="password"
        disabled={form.isSubmitting}
        control={form.control}
      />

      <InputField
        label="Confirm password"
        name="password2"
        type="password"
        disabled={form.isSubmitting}
        control={form.control}
      />

      <Button>Update password</Button>
    </Form>
  );
};
