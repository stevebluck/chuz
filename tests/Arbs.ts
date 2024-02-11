import * as Arbitrary from "@effect/schema/Arbitrary";
import * as fc from "fast-check";
import * as Core from "~/core";
import { Password } from "~/core/auth/Passwords";

export namespace Arbs {
  export namespace Passwords {
    export const Plaintext = Arbitrary.make(Password.Plaintext.schema)(fc);
    export const Strong = Arbitrary.make(Password.Strong.schema)(fc);
  }

  export namespace Emails {
    export const Email: fc.Arbitrary<Core.Email> = fc.emailAddress().map<Core.Email>(Core.Email.unsafeFrom);
  }

  export namespace Users {
    export const FirstName: fc.Arbitrary<Core.User.FirstName> = Arbitrary.make(Core.User.FirstName.schema)(fc);
    export const LastName: fc.Arbitrary<Core.User.LastName> = Arbitrary.make(Core.User.LastName.schema)(fc);
    export const OptInMarketing: fc.Arbitrary<Core.User.OptInMarketing> = fc.boolean().map(Core.User.OptInMarketing);

    export const Register = fc.record({
      credentials: fc.record({
        email: Emails.Email,
        password: Passwords.Strong,
      }),
      firstName: FirstName,
      lastName: LastName,
      optInMarketing: OptInMarketing,
    });
    export type Register = typeof Register extends fc.Arbitrary<infer A> ? A : never;

    export const User: fc.Arbitrary<Core.User> = fc.record({
      firstName: FirstName,
      lastName: LastName,
      email: Emails.Email,
      optInMarketing: OptInMarketing,
    });

    export const DraftUser: fc.Arbitrary<Core.User.Draft> = fc.record(
      {
        firstName: FirstName,
        lastName: LastName,
        optInMarketing: OptInMarketing,
      },
      { requiredKeys: [] },
    );
  }

  export namespace Decks {
    export const Title: fc.Arbitrary<Core.Deck.Title> = Arbitrary.make(Core.Deck.Title.schema)(fc);

    export const Create = fc.record({ title: Title });
  }
}
