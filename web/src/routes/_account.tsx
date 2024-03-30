import { Outlet } from "@remix-run/react";
import { AccountLayout } from "src/account/AccountLayout";

export default function Settings() {
  return (
    <AccountLayout>
      <Outlet />
    </AccountLayout>
  );
}
