import { useSearchParams } from "@remix-run/react";

export const useActiveState = <A extends Record<string, string>>(_: A) => {
  const [searchParams] = useSearchParams();

  const isActive = (section: A[keyof A]) => {
    const activeSection = searchParams.get("active");
    return activeSection ? activeSection === section : false;
  };

  const isOtherActive = (section: A[keyof A]) => (searchParams.get("active") ? !isActive(section) : false);

  return {
    isActive,
    isOtherActive,
  };
};
