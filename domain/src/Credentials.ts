import { Data } from "@chuz/prelude";
import { Email } from "./Email";
import { Password } from "./Password";

export namespace Credentials {
  export type Name = "EmailPassword" | OAuth["_tag"];
  export type Plain = OAuth | EmailPassword.Plain;
  export type Secure = OAuth | EmailPassword.Secure;
  export type Public = OAuth | EmailPassword.Public;

  export type OAuth = Data.TaggedEnum<{ Google: { email: Email } }>;
  export const OAuth = Data.taggedEnum<OAuth>();

  export namespace Secure {
    export const { $match: match, $is: is } = Data.taggedEnum<Secure>();
  }

  export type EmailPassword = Data.TaggedEnum<{
    Plain: { email: Email; password: Password.Plaintext };
    Strong: { email: Email; password: Password.Strong };
    Secure: { email: Email; password: Password.Hashed };
    Public: { email: Email };
  }>;

  export namespace EmailPassword {
    export type Plain = Data.TaggedEnum.Value<EmailPassword, "Plain">;
    export type Strong = Data.TaggedEnum.Value<EmailPassword, "Strong">;
    export type Secure = Data.TaggedEnum.Value<EmailPassword, "Secure">;
    export type Public = Data.TaggedEnum.Value<EmailPassword, "Public">;
    export const { Plain, Strong, Secure, Public, $is: is } = Data.taggedEnum<EmailPassword>();
  }

  export const Type = "Credential";

  export class NotRecognised extends Data.TaggedError(`${Type}NotRecognised`) {}

  export class NoFallbackAvailable extends Data.TaggedError(`${Type}NoFallbackAvailable`) {}

  export class AlreadyInUse extends Data.TaggedError(`${Type}AlreadyInUse`) {}
}
