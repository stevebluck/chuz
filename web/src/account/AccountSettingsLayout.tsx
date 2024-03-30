import { Routes } from "src/Routes";
import { NavLink, NavLinkRenderProps } from "src/components/Link";

type Props = {
  children: React.ReactNode;
};

const navLinkClassname = ({ isActive }: NavLinkRenderProps) => (isActive ? "font-semibold text-primary" : "");

export const AccountSettingsLayout = ({ children }: Props) => {
  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-6xl gap-2">
        <h1 className="text-3xl font-semibold">Settings</h1>
      </div>
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
        <nav className="grid gap-4 text-sm text-muted-foreground">
          <NavLink to={Routes.settings} end className={navLinkClassname}>
            General
          </NavLink>
          <NavLink to={Routes.account} className={navLinkClassname}>
            Account
          </NavLink>
          <NavLink to={Routes.notifications} className={navLinkClassname}>
            Notifications
          </NavLink>
          <NavLink to={Routes.authentication} className={navLinkClassname}>
            Password & authentication
          </NavLink>
        </nav>
        {children}
      </div>
    </main>
  );
};
