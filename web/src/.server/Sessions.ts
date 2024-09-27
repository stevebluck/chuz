import { Session } from "@chuz/domain";
import { Data, Effect, Match, Ref } from "@chuz/prelude";
import { Response } from "./Http";

interface Sessions {
  get: Effect.Effect<RequestSession>;
  mint: (session: Session) => Effect.Effect<void>;
  set: (requestSession: RequestSession) => Effect.Effect<void>;
  invalidate: Effect.Effect<void>;
  authenticated: Effect.Effect<Session, Response.Error.Unauthorized>;
  guest: Effect.Effect<void, Session>;
}

export class CookieSessions implements Sessions {
  constructor(private readonly ref: Ref.Ref<RequestSession>) {}

  get = Effect.suspend(() => Ref.get(this.ref));

  mint = (session: Session) => Ref.set(this.ref, RequestSession.Set({ session }));

  set = (rs: RequestSession) => Ref.set(this.ref, rs);

  invalidate = Effect.suspend(() => Ref.set(this.ref, RequestSession.Unset()));

  authenticated = Effect.suspend(() => Ref.get(this.ref)).pipe(
    Effect.flatMap(
      match({
        NotProvided: () => Effect.fail(Response.Error.Unauthorized),
        Provided: ({ session }) => Effect.succeed(session),
        Set: ({ session }) => Effect.succeed(session),
        InvalidToken: () => Effect.fail(Response.Error.Unauthorized),
        Unset: () => Effect.fail(Response.Error.Unauthorized),
      }),
    ),
  );

  guest = this.authenticated.pipe(Effect.flip, Effect.asVoid);
}

type RequestSession = Data.TaggedEnum<{
  NotProvided: {};
  Provided: { session: Session };
  Set: { session: Session };
  Unset: {};
  InvalidToken: {};
}> & {};

const RequestSession = Data.taggedEnum<RequestSession>();
const match = Match.typeTags<RequestSession>();
