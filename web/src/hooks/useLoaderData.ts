import { useLoaderData as remixUseLoadernData } from "@remix-run/react";
import { useMemo } from "react";
import { S } from "@chuz/prelude";

export const useLoaderData = <A, I>(schema: S.Schema<A, I>) => {
  const data = remixUseLoadernData();

  const decoded = useMemo(() => S.decodeUnknownSync(schema)(data), [data]);

  return decoded;
};
