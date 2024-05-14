import { Route } from "src/Routes";
import { Link } from "src/components/Link";
import { buttonVariants } from "src/components/ui/button";
import { cn } from "src/styles/classnames";
import { AuthSocialButtons } from "./SocialButtons";

interface AuthContentProps {
  to: Route;
  toLabel: string;
  title: string;
  description: string;
  separatorText: string;
  children: React.ReactNode;
  socialButtonsAction: Route;
}
export const AuthContent = ({
  children,
  description,
  title,
  to,
  toLabel,
  socialButtonsAction,
  separatorText,
}: AuthContentProps) => (
  <div>
    <div className="absolute right-4 top-4 md:right-8 md:top-8">
      <Link to={to} className={cn(buttonVariants({ variant: "ghost" }))}>
        {toLabel}
      </Link>
    </div>
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-6">
        {children}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-2">{separatorText}</span>
          </div>
        </div>
        <AuthSocialButtons disabled={false} action={socialButtonsAction} />
      </div>
    </div>
  </div>
);
