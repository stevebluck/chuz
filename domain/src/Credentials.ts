import { Data } from "@chuz/prelude";
import { Email } from "./Email";
import { Password } from "./Password";

export namespace Credentials {
  export type Name = OAuth["_tag"] | "EmailPassword";

  export type OAuth = Data.TaggedEnum<{
    Google: { email: Email };
    Apple: { email: Email };
  }>;

  export type EmailPassword = Data.TaggedEnum<{
    EmailPasswordPlain: { email: Email; password: Password.Plaintext };
    EmailPasswordStrong: { email: Email; password: Password.Strong };
    EmailPasswordSecure: { email: Email; password: Password.Hashed };
    EmailPasswordDisplay: { email: Email };
  }>;

  export namespace EmailPassword {
    export type Plain = Data.TaggedEnum.Value<EmailPassword, "EmailPasswordPlain">;
    export type Strong = Data.TaggedEnum.Value<EmailPassword, "EmailPasswordStrong">;
    export type Secure = Data.TaggedEnum.Value<EmailPassword, "EmailPasswordSecure">;
    export type Display = Data.TaggedEnum.Value<EmailPassword, "EmailPasswordDisplay">;
    export const { EmailPasswordPlain: Plain, EmailPasswordStrong: Strong, EmailPasswordSecure: Secure, EmailPasswordDisplay: Display, $is: is } = Data.taggedEnum<EmailPassword>();
  }

  export type Authentication = OAuth | EmailPassword.Plain;

  export type Registration = OAuth | EmailPassword.Secure;

  export namespace Authentication {
    export const { $is: is } = Data.taggedEnum<Authentication>();
  }

  export namespace Registration {
    export const { $is: is } = Data.taggedEnum<Registration>();
  }

  export const Type = "Credential";

  export class NotRecognised extends Data.TaggedError(`${Type}NotRecognised`) {}

  export class NoFallbackAvailable extends Data.TaggedError(`${Type}NoFallbackAvailable`) {}

  export class AlreadyInUse extends Data.TaggedError(`${Type}AlreadyInUse`) {}
}
