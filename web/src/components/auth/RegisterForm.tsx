import { LoaderIcon } from "lucide-react";
import { Email, StrongPassword, fromCheckboxInput, optionalTextInput } from "src/FormSchema";
import { Routes } from "src/Routes";
import { CheckboxField } from "src/components/CheckboxField";
import { HiddenField } from "src/components/HiddenField";
import { InputField } from "src/components/InputField";
import { Button } from "src/components/ui/button";
import { Form } from "src/components/ui/form";
import { useForm } from "src/hooks/useForm";
import { User } from "@chuz/domain";
import { S } from "@chuz/prelude";

export const RegisterFormSchema = S.Struct({
  _tag: S.Literal("RegisterForm"),
  password: StrongPassword,
  email: Email,
  firstName: optionalTextInput(User.FirstName),
  lastName: optionalTextInput(User.LastName),
  optInMarketing: fromCheckboxInput(User.OptInMarketing),
});

export function RegisterForm() {
  const form = useForm(RegisterFormSchema, {
    action: Routes.register,
    method: "post",
    preventScrollReset: true,
    defaultValues: {
      _tag: "RegisterForm" as const,
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });
  return (
    <Form {...form}>
      <HiddenField name="_tag" />

      <InputField
        name="email"
        label="Email"
        type="email"
        disabled={form.isSubmitting}
        control={form.control}
        placeholder="name@example.com"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect="off"
      />

      <InputField
        name="firstName"
        label="First name"
        type="text"
        disabled={form.isSubmitting}
        control={form.control}
        autoComplete="on"
      />

      <InputField
        name="lastName"
        label="Last name"
        type="text"
        disabled={form.isSubmitting}
        control={form.control}
        autoComplete="on"
      />

      <InputField
        name="password"
        label="Password"
        type="password"
        disabled={form.isSubmitting}
        control={form.control}
      />

      <CheckboxField
        name="optInMarketing"
        label="Opt in to marketing emails"
        description="We won't send you any crap."
        disabled={form.isSubmitting}
        control={form.control}
      />

      <Button disabled={form.isSubmitting} type="submit">
        {form.isSubmitting && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
        Sign up with Email
      </Button>
    </Form>
  );
}
