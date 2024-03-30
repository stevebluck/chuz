import { Outlet } from "@remix-run/react";
import { AccountSettingsLayout } from "src/account/AccountSettingsLayout";

export default function Settings() {
  return (
    <AccountSettingsLayout>
      <Outlet />
    </AccountSettingsLayout>
  );
}
