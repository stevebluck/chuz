import { ParseError } from "@effect/schema/ParseResult";
import { Data } from "effect";
import { Context as _Context, Effect } from "effect";
import * as Match from "effect/Match";
import { RequestContext } from "./remix/RequestLayer";

export type Response<A> = Effect.Effect<Response.Succeed<A> | void, Response.Fail, RequestContext>;

export namespace Response {
  export type Fail = Fail.Redirect | Fail.ValidationError;

  export namespace Fail {
    // TODO: add location nominal
    export class Redirect extends Data.TaggedError("Redirect")<{ location: string }> {}

    export class ValidationError extends Data.TaggedError("ValidationError")<{ error: ParseError }> {}

    export const match = Match.typeTags<Fail>();
  }

  export type Succeed<A> = Succeed.Ok<A> | Succeed.Redirect;

  export namespace Succeed {
    export class Ok<A> extends Data.TaggedClass("Ok")<{ data: A }> {}

    // TODO: add location nominal
    export class Redirect extends Data.TaggedError("Redirect")<{ location: string }> {}

    export const match = Match.typeTags<Fail>();
  }
}
