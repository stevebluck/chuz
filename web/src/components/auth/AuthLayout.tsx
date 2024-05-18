import { Routes } from "src/Routes";
import { Link } from "src/components/Link";
import { Logo } from "src/components/Logo";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="flex min-h-full flex-1">
    <div className="container relative flex-1 flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-zinc-900" />
        <Link to={Routes.home}>
          <Logo />
        </Link>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">&ldquo;Some amazing catchy testimonial should go here.&rdquo;</p>
            <footer className="text-sm">Toby Lerone</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">{children}</div>
    </div>
  </div>
);
