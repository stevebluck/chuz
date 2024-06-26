import { BreadcrumbItem, BreadcrumbPage } from "src/components/ui/breadcrumb";
import { AccountBreadcrumb } from "./AccountBreadcrumb";

type Props = {
  title: string;
  children: React.ReactNode;
};
export const AccountSettingsLayout = ({ title, children }: Props) => {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-col gap-4 pb-10 md:pb-16">
        <AccountBreadcrumb>
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </AccountBreadcrumb>
        <h1 className="text-3xl font-semibold">{title}</h1>
      </div>
      <div className="flex flex-col md:flex-row gap-8 md:gap-20">{children}</div>
    </div>
  );
};
