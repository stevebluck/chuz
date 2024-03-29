import { Link } from "@remix-run/react";
import { Route } from "src/Routes";
import { buttonVariants } from "src/components/ui/button";
import { cn } from "src/styles/classnames";

interface AuthContentProps {
  to: Route;
  toLabel: string;
  title: string;
  description: string;
  children: React.ReactNode;
}
export const AuthContent = ({ children, description, title, to, toLabel }: AuthContentProps) => (
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
      <div>{children}</div>
    </div>
  </div>
);
