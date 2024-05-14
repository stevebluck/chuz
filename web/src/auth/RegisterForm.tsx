import { Credential, User } from "@chuz/domain";
import { S } from "@chuz/prelude";
import { LoaderIcon } from "lucide-react";
import { Email, StrongPassword, fromCheckboxInput, optionalTextInput } from "src/FormSchema";
import { InputField } from "src/components/InputField";
import { Checkbox } from "src/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "src/components/ui/form";
import { useForm } from "src/hooks/useForm";
import { Routes } from "web/Routes";
import { Button } from "web/components/ui/button";
import { Input } from "web/components/ui/input";

export type RegisterFormSchemaEncoded = S.Schema.Encoded<typeof RegisterFormSchema>;
export type RegisterFormSchema = S.Schema.Type<typeof RegisterFormSchema>;
export const RegisterFormSchema = S.Struct({
  _tag: S.Literal(Credential.Tag.EmailPassword),
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
      _tag: Credential.Tag.EmailPassword,
      email: "",
      password: "",
      firstName: "",
      lastName: "",
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

        <FormField
          name="firstName"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>First name</FormLabel>
              <FormControl>
                <Input {...field} type="text" disabled={form.isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="lastName"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last name</FormLabel>
              <FormControl>
                <Input {...field} type="text" disabled={form.isSubmitting} />
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
                <Input type="password" disabled={form.isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-2">
          <div className="items-top flex space-x-2">
            <FormField
              name="optInMarketing"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <div className="flex gap-2">
                    <FormControl>
                      <Checkbox id="optInMarketing" {...field} value={field.value || "on"} />
                    </FormControl>
                    <FormDescription>
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="optInMarketing"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Opt in to marketing emails
                        </label>
                        <p className="text-sm text-muted-foreground">We won't send you any crap.</p>
                      </div>
                    </FormDescription>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <Button disabled={form.isSubmitting} type="submit">
          {form.isSubmitting && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
          Sign up with Email
        </Button>
      </div>
    </Form>
  );
}
