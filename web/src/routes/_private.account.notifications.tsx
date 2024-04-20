import { BellIcon } from "lucide-react";
import { AccountSettingsLayout } from "src/account/AccountSettingsLayout";
import { Card, CardDescription, CardHeader, CardTitle } from "src/components/ui/card";

export default function PersonalInfo() {
  return (
    <AccountSettingsLayout title="Notifications">
      <div className="flex-1 flex flex-col gap-10">TBC...</div>
      <aside className="md:max-w-80 w-full">
        <Card>
          <CardHeader>
            <div className="pb-8">
              <BellIcon />
            </div>
            <CardTitle className="text-base">Notifications</CardTitle>
            <CardDescription>Get notified about important events in your account</CardDescription>
          </CardHeader>
        </Card>
      </aside>
    </AccountSettingsLayout>
  );
}
