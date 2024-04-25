import { Credential, User } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { EmailAlreadyInUse, Registration } from "core/index";
import { Auth, Users } from "./server";
import { Hasher } from "./server/Passwords";

// TODO: Maybe create a tagged union for the errors?

interface Api {
  registerWithEmail: (
    credential: Credential.EmailPassword.Strong,
    user: Omit<Registration, "credential">,
  ) => Effect.Effect<User.Session, EmailAlreadyInUse, Users | Hasher>;

  generateGoogleAuthUrl: (
    intent: Auth.Intent,
  ) => Effect.Effect<[string, Auth.State], Auth.GenerateUrlError, Auth.Google>;

  authenticate: (credential: Credential.Plain.Email) => Effect.Effect<User.Session, Credential.NotRecognised, Users>;
}

export const Api: Api = {
  registerWithEmail: (credential: Credential.EmailPassword.Strong, user: Omit<Registration, "credential">) =>
    Hasher.hash(credential.password).pipe(
      Effect.map((password) => Credential.Secure.Email({ email: credential.email, password })),
      Effect.flatMap((credential) => Users.register({ ...user, credential })),
    ),

  generateGoogleAuthUrl: (intent: Auth.Intent) => Auth.Google.generateAuthUrl(intent),

  authenticate: (credential: Credential.Plain.Email) => Users.authenticate(credential),
};
