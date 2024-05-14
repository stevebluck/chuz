import * as Domain from "@chuz/domain";
import { Equal, Option, S } from "@chuz/prelude";

export const optionalTextInput = <A>(schema: S.Schema<A, string>): S.Schema<Option.Option<A>, string> =>
  S.compose(S.OptionFromString, S.OptionFromSelf(schema));

export const fromCheckboxInput = <A>(schema: S.Schema<A, boolean>): S.Schema<A, string | undefined> =>
  S.compose(S.BooleanFromString, schema);

export const passwordsMatchFilter = <A extends { password: string; password2: string }, I, R>(
  schema: S.Schema<A, I, R>,
) =>
  schema.pipe(
    S.filter(({ password, password2 }) => Equal.equals(password)(password2), {
      message: () => "Passwords do not match",
    }),
  );

export const Email = Domain.Email.pipe(S.message(() => "Invalid email address"));

export const StrongPassword = Domain.Password.Strong.pipe(S.message(() => "Your password is too weak"));
