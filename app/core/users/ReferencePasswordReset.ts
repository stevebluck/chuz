import { Clock, Effect, Equivalence } from "effect";
import { Id, eqId } from "../Identified";
import { Email } from "../emails/Email";
import { ReferenceTokens } from "../tokens/ReferenceTokens";
import { Tokens } from "../tokens/Tokens";
import { User } from "./Users";

export type PasswordReset = [Email, Id<User>];

const passwordResetEq: Equivalence.Equivalence<PasswordReset> = ([email1, id1], [email2, id2]) =>
  Email.equals(email1, email2) && eqId(id1, id2);

export const ReferencePasswordReset = (clock: Clock.Clock): Effect.Effect<Tokens<PasswordReset>> =>
  ReferenceTokens.create<PasswordReset>(clock, passwordResetEq);
