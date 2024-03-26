import { Credential, Email, Session, User } from "@chuz/domain";
import { Effect } from "effect";
import { Users } from "..";
import { Auth } from "./Auth";

export interface ProviderAuth {
  exchangeCodeForSession: (
    code: Auth.Code,
  ) => Effect.Effect<Session<User>, Auth.ExchangeCodeError | Email.AlreadyInUse | Credential.NotRecognised, Users>;
  generateAuthUrl: (state: Auth.State) => Effect.Effect<string, Auth.GenerateUrlError>;
}
