import { Clock } from "effect";
import { ReferenceDecks } from "./decks/ReferenceDecks";
import { ReferenceTokens } from "./tokens/ReferenceTokens";
import { ReferencePasswordReset } from "./users/ReferencePasswordReset";
import { ReferenceUsers } from "./users/ReferenceUsers";

export * from "./Capabilities";
export * from "./Identified";

export * from "./auth/Passwords";
export * from "./auth/Credentials";
export * from "./auth/Session";
export * from "./auth/Errors";

export * from "./emails/Email";

export * from "./tokens/Tokens";

export * from "./users/Users";
export * from "./decks/Decks";

export const Reference = {
  Clock,
  PasswordReset: ReferencePasswordReset,
  Tokens: ReferenceTokens,
  Users: ReferenceUsers,
  Decks: ReferenceDecks,
};
