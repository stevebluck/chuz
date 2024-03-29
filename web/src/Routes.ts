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
  myAccount: Route("/my-account"),
  logout: Route("/logout"),
  setTheme: Route("/action/set-theme"),
};
