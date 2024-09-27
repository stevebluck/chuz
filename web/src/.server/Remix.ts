import { unstable_data } from "@remix-run/react";
import { ArrayFormatter, Cause, Effect, Exit, Match } from "@chuz/prelude";
import { Response } from "./Http";

export namespace Remix {
  export const fromEffect = <A>(eff: Effect.Effect<Response.Success<A>, Response.Error>) =>
    eff
      .pipe(
        Effect.flatMap(
          Match.valueTags({
            Ok: ({ value }) => Effect.succeed(value),
            Redirect: (e) => Effect.fail(e),
          }),
        ),
        Effect.mapError(
          Response.Error.match({
            DecodeError: ({ _tag, error }) => {
              return unstable_data({ _tag, error: ArrayFormatter.formatErrorSync(error) }, { status: 400 });
            },
            EncodeError: ({ _tag, error }) => {
              return unstable_data({ _tag, error: ArrayFormatter.formatErrorSync(error) }, { status: 500 });
            },
            Redirect: ({ location, _tag }) => {
              return unstable_data({ _tag }, { status: 302, headers: { Location: location } });
            },
            BadRequest: ({ _tag }) => {
              return unstable_data({ _tag }, { status: 400 });
            },
            NotFound: ({ _tag }) => {
              return unstable_data({ _tag }, { status: 404 });
            },
            ServerError: ({ reason, _tag }) => {
              return unstable_data({ _tag, reason }, { status: 500 });
            },
            Unauthorized: ({ _tag }) => {
              return unstable_data({ _tag }, { status: 401 });
            },
          }),
        ),
        Effect.runPromiseExit,
      )
      .then(
        Exit.getOrElse((cause) => {
          if (Cause.isFailType(cause)) {
            throw cause.error;
          }

          throw unstable_data({ _tag: cause._tag, message: Cause.pretty(cause) }, { status: 500 });
        }),
      );
}
