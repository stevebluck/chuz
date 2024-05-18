import { Password } from "@chuz/domain";
import { S } from "@chuz/prelude";
import { passwordsMatchFilter } from "src/FormSchema";
import { Routes } from "src/Routes";
import { HiddenField } from "src/components/HiddenField";
import { InputField } from "src/components/InputField";
import { Button } from "src/components/ui/button";
import { Form } from "src/components/ui/form";
import { useForm } from "src/hooks/useForm";

export const SetPasswordFormSchema = S.Struct({
  _tag: S.Literal("SetPassword"),
  password: Password.Strong,
  password2: Password.Strong,
}).pipe(passwordsMatchFilter);

export const SetPasswordForm = () => {
  const form = useForm(SetPasswordFormSchema, {
    action: Routes.account.loginAndSecurity,
    method: "post",
    preventScrollReset: true,
    defaultValues: {
      _tag: "SetPassword" as const,
      password: "",
      password2: "",
    },
  });
  return (
    <Form {...form}>
      <HiddenField name="_tag" control={form.control} />

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

      <Button>Add password</Button>
    </Form>
  );
};
