import { Brand } from "effect";

export type Route = string & Brand.Brand<"Route">;
const Route = Brand.nominal<Route>();

export const Routes = {
  home: Route("/"),
  login: Route("/login"),
  register: Route("/register"),
  myAccount: Route("/my-account"),
  logout: Route("/logout"),
  setTheme: Route("/action/set-theme"),
};
