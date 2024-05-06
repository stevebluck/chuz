import { Effect } from "@chuz/prelude";

export class ResponseHeaders extends Effect.Tag("@web/ResponseHeaders")<ResponseHeaders, Headers>() {}
