import { useActionData as remixUseActionData } from "@remix-run/react";

export const useActionData = () => {
  const data = remixUseActionData<Record<string, string | undefined>>();
  return data || null;
};
