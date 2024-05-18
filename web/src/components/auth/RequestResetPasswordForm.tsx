import { S } from "@chuz/prelude";
import { LoaderIcon } from "lucide-react";
import { Email } from "src/FormSchema";
import { Routes } from "src/Routes";
import { Button } from "src/components/ui/button";
import { useForm } from "src/hooks/useForm";
import { InputField } from "../InputField";
import { Form } from "../ui/form";

export const RequestResetPasswordFormSchema = S.Struct({
  _tag: S.Literal("RequestResetPassword"),
  email: Email,
});

export const RequestResetPasswordForm = () => {
  const form = useForm(RequestResetPasswordFormSchema, {
    action: Routes.forgotPassword,
    method: "post",
    preventScrollReset: true,
    defaultValues: {
      _tag: "RequestResetPassword" as const,
      email: "",
    },
  });

  return (
    <Form {...form}>
      <InputField
        label="Email"
        name="email"
        type="email"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect="off"
      />

      <Button disabled={form.isSubmitting} type="submit">
        {form.isSubmitting && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
        Reset
      </Button>
    </Form>
  );
};
