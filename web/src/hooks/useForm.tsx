import { Array, Effect, Option, Record, S } from "@chuz/prelude";
import { ArrayFormatter } from "@chuz/prelude/src/Schema";
import { useActionData, useFetcher } from "@remix-run/react";
import { DefaultValues, FieldErrors, FieldValues, ResolverResult, useForm as useHookForm } from "react-hook-form";
import { Route } from "src/Routes";

interface Options<I extends FieldValues> {
  method: "post" | "get" | "put" | "delete";
  action: Route;
  preventScrollReset: boolean;
  defaultValues: DefaultValues<I>;
}

export const useForm = <A, I extends FieldValues>(schema: S.Schema<A, I>, options: Options<I>) => {
  const actionData = useActionData();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting" && fetcher.formAction === options.action;

  const data: any = fetcher.data || actionData;

  const form = useHookForm<I>({
    resolver: schemaResolver(schema),
    errors: data?.errors as FieldErrors<I>,
    defaultValues: options.defaultValues,
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

const schemaResolver = <A, I extends FieldValues>(schema: S.Schema<A, I>) => {
  const decode = S.decode(schema, { errors: "all", onExcessProperty: "error" });

  return async (values: I): Promise<ResolverResult<I>> => {
    return decode(values).pipe(
      Effect.map(() => ({ errors: {}, values })),
      Effect.catchAll((error) =>
        ArrayFormatter.formatError(error).pipe(
          Effect.map(Array.groupBy((a) => a.path.join("."))),
          Effect.map(Record.map(Array.head)),
          Effect.map(Record.map(Option.getOrUndefined)),
          Effect.map((result) => ({ errors: result, values: {} }) as ResolverResult<I>),
        ),
      ),
      Effect.merge,
      Effect.runPromise,
    );
  };
};
