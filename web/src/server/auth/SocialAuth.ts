import { Credentials, User } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { Users } from "..";
import { Auth } from "./Auth";

export interface SocialAuth {
  exchangeCodeForSession: (
    code: Auth.Code,
  ) => Effect.Effect<User.Session, Auth.ExchangeCodeError | User.EmailAlreadyInUse | Credentials.NotRecognised, Users>;
  generateAuthUrl: (state: Auth.State) => Effect.Effect<string, Auth.GenerateUrlError>;
}
