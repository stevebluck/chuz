import { Control, FieldValues, UseControllerProps } from "react-hook-form";
import { FormControl, FormField, FormItem } from "./ui/form";
import { Input, InputProps } from "./ui/input";

interface Props<T extends FieldValues> extends UseControllerProps<T>, Omit<InputProps, "name" | "defaultValue"> {}

export const HiddenField = <T extends FieldValues>({ name, control }: Props<T>) => {
  return (
    <FormField
      name={name}
      control={control as Control<T>}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input type="hidden" readOnly {...field} />
          </FormControl>
        </FormItem>
      )}
    />
  );
};
