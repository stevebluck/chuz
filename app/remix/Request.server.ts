import { Context } from "effect";

export class Request extends Context.Tag("Request")<Request, globalThis.Request>() {}
