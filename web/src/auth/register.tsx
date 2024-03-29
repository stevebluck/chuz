import { Link } from "@remix-run/react";
import { Routes } from "src/Routes";
import { buttonVariants } from "src/components/ui/button";
import { cn } from "src/styles/classnames";
import { RegisterForm } from "./RegisterForm";

export const Register = ({ error }: { error: Record<string, string[]> }) => (
  <div>
    <div className="absolute right-4 top-4 md:right-8 md:top-8">
      <Link to={Routes.login} className={cn(buttonVariants({ variant: "ghost" }))}>
        Login
      </Link>
    </div>
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign up to your account</h1>
        <p className="text-sm text-muted-foreground">Lets get learning!</p>
      </div>
      <div>
        <RegisterForm error={error} />
      </div>
    </div>
  </div>
);
