import { Brand } from "@chuz/prelude";

export type Route = Brand.Branded<string, "Route">;
const Route = Brand.nominal<Route>();

export const Routes = {
  home: Route("/"),
  login: Route("/login"),
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
    loginAndSecurityError: (name: string) => Route(`/account/login-and-security?active=${name}`),
    personalInfo: Route("/account/personal-info"),
  },
  api: {
    addPassword: Route("/api/add-password"),
    updatePassword: Route("/api/update-password"),
  },
  todo: Route("/"),
};
