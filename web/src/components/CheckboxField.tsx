import { CheckboxProps } from "@radix-ui/react-checkbox";
import React from "react";
import { Control, FieldValues, UseControllerProps } from "react-hook-form";
import { Checkbox } from "./ui/checkbox";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";

interface Props<T extends FieldValues> extends UseControllerProps<T>, Omit<CheckboxProps, "name" | "defaultValue"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const CheckboxField = <T extends FieldValues>({
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
          <div className="flex gap-2">
            <FormControl>
              <Checkbox {...props} {...field} />
            </FormControl>
            <div className="grid gap-1.5 leading-none">
              {label && (
                <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {label}
                </FormLabel>
              )}
              {description && <FormDescription>We won't send you any crap.</FormDescription>}
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
