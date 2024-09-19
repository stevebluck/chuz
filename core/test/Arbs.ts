import * as Domain from "@chuz/domain";
import { Arbitrary, FC, Option } from "@chuz/prelude";

export namespace Arbs {
  export const OptionArb = <A>(arb: FC.Arbitrary<A>): FC.Arbitrary<Option.Option<A>> => FC.option(arb).map(Option.fromNullable);

  export namespace Emails {
    export const Email: FC.Arbitrary<Domain.Email> = FC.emailAddress().map<Domain.Email>(Domain.Email.unsafeFrom);
  }

  export namespace Password {
    export const Plaintext = Arbitrary.make(Domain.Password.Plaintext);
    export const Strong = Arbitrary.make(Domain.Password.Strong);
  }

  export namespace Credentials {
    export namespace EmailPassword {
      export const Plain = FC.record({ _tag: FC.constant("Plain" as const), email: Emails.Email, password: Password.Plaintext });
      export const Strong = FC.record({ _tag: FC.constant("Strong" as const), email: Emails.Email, password: Password.Strong });
    }
  }

  export namespace Users {
    export const FirstName = Arbitrary.make(Domain.User.FirstName);
    export const LastName = Arbitrary.make(Domain.User.LastName);
    export const OptInMarketing = Arbitrary.make(Domain.User.OptInMarketing);

    export namespace Registration {
      export const EmailPassword = FC.record({
        credentials: Credentials.EmailPassword.Strong,
        firstName: OptionArb(FirstName),
        lastName: OptionArb(LastName),
        optInMarketing: OptInMarketing,
      });

      export const Google = FC.record({
        credentials: FC.record({ _tag: FC.constant("Google" as const), email: Emails.Email }),
        firstName: OptionArb(FirstName),
        lastName: OptionArb(LastName),
        optInMarketing: OptInMarketing,
      });
    }

    export const Patch = FC.record(
      {
        firstName: OptionArb(FirstName),
        lastName: OptionArb(LastName),
        optInMarketing: OptInMarketing,
      },
      { requiredKeys: [] },
    );
  }
}
