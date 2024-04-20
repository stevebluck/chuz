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
  account: {
    home: Route("/account"),
    notifications: Route("/account/notifications"),
    loginAndSecurity: Route("/account/login-and-security"),
    personalInfo: Route("/account/personal-info"),
  },
  api: {
    addPassword: Route("/api/add-password"),
    updatePassword: Route("/api/update-password"),
  },
  todo: Route("/"),
};
