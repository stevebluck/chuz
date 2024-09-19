import * as Domain from "@chuz/domain";
import { Arbitrary, FC, Option } from "@chuz/prelude";

export namespace Arbs {
  export const OptionArb = <A>(arb: FC.Arbitrary<A>): FC.Arbitrary<Option.Option<A>> => FC.option(arb).map(Option.fromNullable);

  export namespace Emails {
    export const Email: FC.Arbitrary<Domain.Email> = FC.emailAddress().map<Domain.Email>(Domain.Email.unsafeFrom);
  }

  export namespace Passwords {
    export const Plaintext = Arbitrary.make(Domain.Password.Plaintext);
    export const Strong = Arbitrary.make(Domain.Password.Strong);
  }

  export namespace Users {
    export const FirstName = Arbitrary.make(Domain.User.FirstName);
    export const LastName = Arbitrary.make(Domain.User.LastName);
    export const OptInMarketing = Arbitrary.make(Domain.User.OptInMarketing);

    export const Registration = FC.record({
      credentials: FC.record({
        _tag: FC.constant("EmailPasswordStrong" as const),
        email: Emails.Email,
        password: Passwords.Strong,
      }),
      firstName: OptionArb(FirstName),
      lastName: OptionArb(LastName),
      optInMarketing: OptInMarketing,
    });
  }

  export namespace Registration {}
}
