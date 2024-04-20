import { Option, S } from "@chuz/prelude";
import { useSearchParams } from "@remix-run/react";

const SEARCH_PARAM_ACTIVE_KEY = "active";

export const useActiveState = <A extends Record<string, string>>(sections: A) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = Object.fromEntries(searchParams.entries());

  const activeSection = S.decodeUnknownOption(S.struct({ active: S.literal(...Object.values(sections)) }))(values);

  const setActive = (section: A[keyof A], active: boolean) => {
    const params = new URLSearchParams();
    active ? params.set(SEARCH_PARAM_ACTIVE_KEY, section) : params.delete(SEARCH_PARAM_ACTIVE_KEY);

    setSearchParams(params, { replace: true });
  };

  const isActive = (section: A[keyof A]) =>
    activeSection.pipe(
      Option.map(({ active }) => active === section),
      Option.getOrElse(() => false),
    );

  const isOtherActive = (section: A[keyof A]) => Option.isSome(activeSection) && !isActive(section);

  return {
    setActive,
    isActive,
    isOtherActive,
  };
};
