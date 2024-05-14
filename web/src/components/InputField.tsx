import React from "react";
import { Control, FieldValues, UseControllerProps } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input, InputProps } from "./ui/input";

interface Props<T extends FieldValues> extends UseControllerProps<T>, Omit<InputProps, "name" | "defaultValue"> {
  label: React.ReactNode;
  description?: React.ReactNode;
}

export const InputField = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  defaultValue,
  rules,
  shouldUnregister,
  ...props
}: Props<T>) => {
  return (
    <FormField
      name={name}
      control={control as Control<T>}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...props} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
