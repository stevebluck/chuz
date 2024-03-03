import * as S from "@effect/schema/Schema";

export type Route = S.Schema.To<typeof Route>;
export const Route = S.string.pipe(S.brand("Route"));

export type Action = S.Schema.To<typeof Route>;
export const Action = S.string.pipe(S.brand("Action"));

export const Routes = {
  home: Route("/"),
  login: Route("/login"),
  myAccount: Route("/my-account"),
  setTheme: Action("/action/set-theme"),
};
