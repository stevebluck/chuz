import { Link } from "@remix-run/react";
import { Routes } from "src/Routes";
import { buttonVariants } from "src/components/ui/button";
import { cn } from "src/styles/classnames";
import { LoginForm } from "./login-form";

export const Login = ({ data }: { data: any }) => (
  <div>
    <div className="absolute right-4 top-4 md:right-8 md:top-8">
      <Link to={Routes.register} className={cn(buttonVariants({ variant: "ghost" }))}>
        Create an account
      </Link>
    </div>
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to your account</h1>
        <p className="text-sm text-muted-foreground">Lets get back to learning!</p>
      </div>
      <div>
        <div>
          <h6>Action data:</h6>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
        <LoginForm />
      </div>
    </div>
  </div>
);
