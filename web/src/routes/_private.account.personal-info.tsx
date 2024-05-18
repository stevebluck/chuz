import { UserCircle } from "lucide-react";
import { TitledSection } from "src/components/TitledSection";
import { AccountSettingsLayout } from "src/components/account/AccountSettingsLayout";
import { Button } from "src/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "src/components/ui/card";

export default function PersonalInfo() {
  return (
    <AccountSettingsLayout title="Personal info">
      <div className="flex-1 flex flex-col gap-10">
        <TitledSection title="Login">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between gap-2">
              <h3>Email</h3>
              <Button variant="link">Update</Button>
            </div>
            <p className="text-muted-foreground">email@email.com</p>
          </div>
        </TitledSection>
      </div>
      <aside className="md:max-w-80 w-full">
        <Card>
          <CardHeader>
            <div className="pb-8">
              <UserCircle />
            </div>
            <CardTitle className="text-base">Personal info</CardTitle>
            <CardDescription>Basic info, like your name and photo</CardDescription>
          </CardHeader>
        </Card>
      </aside>
    </AccountSettingsLayout>
  );
}
