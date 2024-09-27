import { Params } from "@remix-run/react";
import { AST, Data, Effect, PR, S } from "@chuz/prelude";

export namespace Request {
  export type DecodePath<I, O extends Params<string>> = (path: O) => Effect.Effect<I, Response.DecodeError>;
  export type DecodeHeaders<I> = (request: globalThis.Request) => Effect.Effect<I, Response.DecodeError>;
  export type DecodeSearchParams<I> = (request: globalThis.Request) => Effect.Effect<I, Response.DecodeError>;
  export type DecodeBody<I> = (request: globalThis.Request) => Effect.Effect<I, Response.DecodeError>;

  export const decodeSearchParams = <S, SI extends Record<string, string>>(
    schema: S.Schema<S, SI>,
    options: AST.ParseOptions = { errors: "all" },
  ): DecodeSearchParams<S> => {
    const decode = S.decode(schema, options);
    return (request: globalThis.Request) => {
      const search = new URLSearchParams(request.url);
      const b = Object.fromEntries(search.entries()) as SI;
      return decode(b).pipe(Effect.mapError((error) => Response.DecodeError({ type: "search", error })));
    };
  };

  export const decodeHeaders = <H, HI extends Record<string, string>>(
    schema: S.Schema<H, HI>,
    options: AST.ParseOptions = { errors: "all" },
  ): DecodeHeaders<H> => {
    const decode = S.decode(schema, options);
    return (request: globalThis.Request) => {
      const headers = Object.fromEntries(request.headers.entries()) as HI;
      return decode(headers).pipe(Effect.mapError((error) => Response.DecodeError({ type: "headers", error })));
    };
  };

  export const decodePath = <P, PI extends Params<string>>(
    schema: S.Schema<P, PI>,
    options: AST.ParseOptions = { errors: "all" },
  ): DecodePath<P, PI> => {
    const decode = S.decode(schema, options);
    return (path) => decode(path).pipe(Effect.mapError((error) => Response.DecodeError({ type: "path", error })));
  };

  export const decodeBody = <
    Tag extends "FormData" | "Json",
    I,
    O extends Tag extends "FormData" ? Record<string, string | undefined> : any,
  >(
    type: Tag,
    schema: S.Schema<I, O>,
    options: AST.ParseOptions = { errors: "all" },
  ): DecodeBody<I> => {
    return (request: globalThis.Request) => {
      if (type === "FormData") {
        return Effect.promise(() => request.formData()).pipe(
          Effect.map((formData) => Object.fromEntries(formData.entries()) as I),
          Effect.flatMap(S.decodeUnknown(schema, options)),
          Effect.mapError((error) => Response.DecodeError({ type: "body", error })),
        );
      }
      return Effect.promise(() => request.json()).pipe(
        Effect.flatMap(S.decodeUnknown(schema, options)),
        Effect.mapError((error) => Response.DecodeError({ type: "body", error })),
      );
    };
  };
}

export namespace Response {
  export type Success<A> = Data.TaggedEnum<{
    Ok: { value: A };
    Redirect: { location: string };
  }>;

  export type Error = Data.TaggedEnum<{
    DecodeError: { type: "search" | "headers" | "path" | "body"; error: PR.ParseError };
    EncodeError: { error: PR.ParseError };
    BadRequest: {};
    Unauthorized: {};
    NotFound: {};
    Redirect: { location: string };
    ServerError: { reason: unknown };
  }>;
  const error = Data.taggedEnum<Error>();

  export type DecodeError = Data.TaggedEnum.Value<Error, "DecodeError">;
  export const DecodeError = error.DecodeError;

  export namespace Success {
    const Success = <A>() => Data.taggedEnum<Success<A>>();

    export const match = <A>() => Success<A>().$match;

    export const Ok = <I, O>(schema: S.Schema<I, O>) => {
      const encode = S.encode(schema);
      return (value: I) =>
        encode(value).pipe(
          Effect.mapError((e) => error.EncodeError({ error: e })),
          Effect.map((value) => Success<O>().Ok({ value })),
        );
    };

    export const Redirect = (location: string): Success<never> => {
      return Success<never>().Redirect({ location });
    };
  }

  export namespace Error {
    export type Unauthorized = Data.TaggedEnum.Value<Error, "Unauthorized">;
    export const match = error.$match;
    export const Unauthorized = error.Unauthorized();
    export const BadRequest = error.BadRequest();
    export const Redirect = (location: string) => error.Redirect({ location });
    export const NotFound = error.NotFound();
    export const ServerError = (reason: unknown) => error.ServerError({ reason });
  }
}
