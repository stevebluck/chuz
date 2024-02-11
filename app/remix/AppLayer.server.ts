import { Layer, ConfigProvider, Clock as EffectClock, Effect } from "effect";
import { DecksTag, HasherTag, Passwords, UsersTag, tokenEq } from "~/core";
import { ReferenceDecks } from "~/core/decks/ReferenceDecks";
import { ReferenceTokens } from "~/core/tokens/ReferenceTokens";
import { ReferencePasswordReset } from "~/core/users/ReferencePasswordReset";
import { ReferenceUsers } from "~/core/users/ReferenceUsers";

export type AppLayer = Layer.Layer.Success<typeof AppLayer>;

const clock = EffectClock.make();
const Hasher = Layer.succeed(HasherTag, Passwords.hasher(4));

const UsersLive = Layer.effect(
  UsersTag,
  Effect.gen(function* (_) {
    const sessionTokens = yield* _(ReferenceTokens.create(clock, tokenEq));
    const passwordResetTokens = yield* _(ReferencePasswordReset(clock));

    return yield* _(ReferenceUsers.create(sessionTokens, passwordResetTokens));
  }),
);

const DecksLive = Layer.effect(DecksTag, UsersTag.pipe(Effect.flatMap(ReferenceDecks.create)));

const MainLive = Layer.mergeAll(Hasher, DecksLive).pipe(Layer.provideMerge(UsersLive));

export const AppLayer = MainLive.pipe(Layer.provideMerge(Layer.setConfigProvider(ConfigProvider.fromEnv())));
