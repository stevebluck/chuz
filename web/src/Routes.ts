import { Brand } from "@chuz/prelude";

export type Route = string & Brand.Brand<"Route">;
const Route = Brand.nominal<Route>();

export const Routes = {
  home: Route("/"),
  login: Route("/login"),
  register: Route("/register"),
  authenticate: Route("/authenticate"),
  myAccount: Route("/my-account"),
  logout: Route("/logout"),
  setTheme: Route("/action/set-theme"),
};
