import { Brand } from "@chuz/prelude";

export type Route = string & Brand.Brand<"Route">;
const Route = Brand.nominal<Route>();

export const Routes = {
  home: Route("/"),
  login: Route("/login"),
  register: Route("/register"),
  authenticate: Route("/authenticate"),
  forgotPassword: Route("/forgot-password"),
  resetPassword: (token: string) => Route(`/reset-password?token=${token}`),
  logout: Route("/logout"),
  myAccount: Route("/my-account"),
  settings: Route("/settings"),
  account: Route("/settings/account"),
  notifications: Route("/settings/notifications"),
  authentication: Route("/settings/authentication"),
  todo: Route("/my-account"),
};
