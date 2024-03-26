import { Credentials, Email, User } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { Users } from "..";
import { Auth } from "./Auth";

export interface ProviderAuth {
  exchangeCodeForSession: (
    code: Auth.Code,
  ) => Effect.Effect<User.Session, Auth.ExchangeCodeError | Email.AlreadyInUse | Credentials.NotRecognised, Users>;
  generateAuthUrl: (state: Auth.State) => Effect.Effect<string, Auth.GenerateUrlError>;
}
