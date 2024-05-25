import { effectTsResolver } from "@hookform/resolvers/effect-ts";
import { useActionData, useFetcher } from "@remix-run/react";
import { DefaultValues, FieldValues, useForm as useHookForm } from "react-hook-form";
import { Route } from "src/Routes";
import { S } from "@chuz/prelude";

interface Options<T> {
  method: "post" | "get" | "put" | "delete";
  action: Route;
  preventScrollReset: boolean;
  defaultValues: DefaultValues<T>;
}

export const useForm = <A extends FieldValues, I>(schema: S.Schema<A, I>, options: Options<I>) => {
  const actionData = useActionData();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting" && fetcher.formAction === options.action;

  const data: any = fetcher.data || actionData;

  const form = useHookForm<A>({
    resolver: effectTsResolver(schema),
    errors: data?.errors as any,
    defaultValues: options.defaultValues as any,
  });

  const onSubmit = form.handleSubmit((values) => {
    fetcher.submit(values, {
      method: options.method,
      preventScrollReset: options.preventScrollReset,
      action: options.action,
    });
  });

  return { ...form, onSubmit, isSubmitting, action: options.action, method: options.method };
};
