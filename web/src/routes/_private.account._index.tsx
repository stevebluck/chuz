import { BellIcon, CreditCardIcon, EyeIcon, GiftIcon, GlobeIcon, ShieldIcon, SquareUserRoundIcon } from "lucide-react";
import { Routes } from "src/Routes";
import { LinkedCard } from "src/components/LinkedCard";

export default function Account() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-3xl font-semibold">Account</h1>
      </div>
      <div className="mx-auto w-full max-w-6xl">
        <nav className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <LinkedCard
            icon={<SquareUserRoundIcon />}
            title="Personal info"
            description="Basic info, like your name and photo"
            to={Routes.account.personalInfo}
          />
          <LinkedCard
            icon={<ShieldIcon />}
            title="Login & security"
            description="Update your password and secure your account"
            to={Routes.account.loginAndSecurity}
          />
          <LinkedCard
            icon={<BellIcon />}
            title="Notifications"
            description="Choose your notification preferences"
            to={Routes.account.notifications}
          />
          <LinkedCard
            icon={<GlobeIcon />}
            title="Global preferences"
            description="Set your language and timezone"
            to={Routes.account.home}
          />
          <LinkedCard
            icon={<EyeIcon />}
            title="Privacy & sharing"
            description="Manage your personal data and what you share with others"
            to={Routes.account.home}
          />
          <LinkedCard
            icon={<CreditCardIcon />}
            title="Payment details"
            description="Add or remove payment methods"
            to={Routes.account.home}
          />
          <LinkedCard
            icon={<GiftIcon />}
            title="Referrals"
            description="Track your referrals and rewards"
            to={Routes.account.home}
          />
        </nav>
      </div>
    </div>
  );
}
