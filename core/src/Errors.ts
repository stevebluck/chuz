import { Data } from "@chuz/prelude";

export class NoSuchToken extends Data.TaggedError("NoSuchToken") {}

export class GenerateUrlFailure extends Data.TaggedError("GenerateUrlFailure")<{ error: unknown }> {}
