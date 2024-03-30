import type { MetaFunction } from "@remix-run/node";
import { Link, Outlet } from "@remix-run/react";
import { Routes } from "web/Routes";
import { ThemeToggle } from "web/components/theme-toggle";

export const meta: MetaFunction = () => {
  return [{ title: "Chuzwozza" }, { name: "description", content: "Development" }];
};

export default function Index() {
  return (
    <div>
      <header>
        <ThemeToggle />
      </header>

      <ul>
        <li>
          <Link to={Routes.login}>Login</Link>
        </li>
        <li>
          <Link to={Routes.dashboard}>Dashboard</Link>
        </li>
        <li>
          <Link to={Routes.settings}>Settings</Link>
        </li>
      </ul>
      <Outlet />
    </div>
  );
}
