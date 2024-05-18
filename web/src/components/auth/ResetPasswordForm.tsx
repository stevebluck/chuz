import { Form } from "@remix-run/react";
import { LoaderIcon } from "lucide-react";
import { StrongPassword } from "src/FormSchema";
import { Routes } from "src/Routes";
import { Button } from "src/components/ui/button";
import { useForm } from "src/hooks/useForm";
import { S } from "@chuz/prelude";
import { InputField } from "../InputField";

interface Props {
  token: string;
}

export const ResetPasswordFormSchema = S.Struct({
  _tag: S.Literal("ResetPassword"),
  password: StrongPassword,
});

export const ResetPasswordForm = ({ token }: Props) => {
  const form = useForm(ResetPasswordFormSchema, {
    action: Routes.resetPassword(token),
    method: "post",
    preventScrollReset: true,
    defaultValues: {
      _tag: "ResetPassword" as const,
      password: "",
    },
  });

  return (
    <Form {...form}>
      <InputField
        name="password"
        label="Password"
        type="password"
        disabled={form.isSubmitting}
        control={form.control}
      />

      <Button disabled={form.isSubmitting} type="submit">
        {form.isSubmitting && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
        Reset
      </Button>
    </Form>
  );
};
