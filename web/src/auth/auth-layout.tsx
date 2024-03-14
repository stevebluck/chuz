import { Link } from "@remix-run/react";
import { Route } from "src/Routes";
import { Logo } from "src/components/Logo";
import { buttonVariants } from "src/components/ui/button";
import { cn } from "src/styles/classnames";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="flex min-h-full flex-1">
    <div className="container relative flex-1 flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-zinc-900" />
        <Logo />
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">&ldquo;The most effective way to learn anything really fast.&rdquo;</p>
            <footer className="text-sm">Toby Lerone</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">{children}</div>
    </div>
  </div>
);

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
