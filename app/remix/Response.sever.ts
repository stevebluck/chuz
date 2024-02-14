import { Data, Match } from "effect";
import { Route } from "~/Routes";

export type Response<A, B> = Data.TaggedEnum<{
  Message: { data: A };
  Ok: {};
  Redirect: { route: Route };
  ValidationError: { errors: Record<string, readonly string[] | undefined> };
  UnknownError: { error: B };
}>;

interface ResponseDefinition extends Data.TaggedEnum.WithGenerics<2> {
  readonly taggedEnum: Response<this["A"], this["B"]>;
}

export namespace Response {
  export const match = <A, B>() => Match.typeTags<Response<A, B>>();

  export const { Redirect, ValidationError, UnknownError, Ok } = Data.taggedEnum<ResponseDefinition>();
}
