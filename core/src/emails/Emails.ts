import { Email } from "@chuz/domain";

export namespace Emails {
  export const toLowerCase = (e: Email): Email => Email.unsafeFrom(e.toLowerCase());
  export const toUpperCase = (email: Email): Email => Email.unsafeFrom(email.toUpperCase());
}
