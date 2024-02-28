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
        <Link to={Routes.login}>Login</Link>
      </header>
      <Outlet />
    </div>
  );
}
