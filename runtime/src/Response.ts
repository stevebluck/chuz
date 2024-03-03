import { Data } from "effect";
import { Context as _Context, Effect } from "effect";
import * as Match from "effect/Match";
import { RequestContext } from "./remix/RequestLayer";

export type Response<A> = Effect.Effect<A, Response.Fail, RequestContext>;

export namespace Response {
  export type Fail = Data.TaggedEnum<{
    NotFound: {};
    Redirect: { location: string };
  }>;

  export namespace Fail {
    export const { NotFound, Redirect } = Data.taggedEnum<Fail>();
    export const match = Match.typeTags<Fail>();
  }
}
