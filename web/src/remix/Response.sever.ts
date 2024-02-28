import { Data, Match } from "effect";
import { Route } from "web/Routes";

export type Response<A, B> = Data.TaggedEnum<{
  Ok: { data?: A };
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
