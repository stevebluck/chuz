import { Brand } from "@chuz/prelude";

export type Route = string & Brand.Brand<"Route">;
const Route = Brand.nominal<Route>();

export const Routes = {
  home: Route("/"),
  login: Route("/login"),
  loginWithReturn: (returnTo: string) => Route(`/login?returnTo=${returnTo}`),
  register: Route("/register"),
  authenticate: Route("/authenticate"),
  forgotPassword: Route("/forgot-password"),
  resetPassword: (token: string) => Route(`/reset-password?token=${token}`),
  logout: Route("/logout"),
  dashboard: Route("/dashboard"),
  settings: Route("/settings"),
  account: Route("/settings/account"),
  notifications: Route("/settings/notifications"),
  authentication: Route("/settings/authentication"),
  todo: Route("/my-account"),
};
