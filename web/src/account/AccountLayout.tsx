import { Menu, Search } from "lucide-react";
import { Routes } from "src/Routes";
import { Link, NavLink, NavLinkRenderProps } from "src/components/Link";
import { Logo } from "src/components/Logo";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "src/components/ui/sheet";
import { UserDropdownMenu } from "./UserDropdownMenu";

interface Props {
  children: React.ReactNode;
}

export const AccountLayout = ({ children }: Props) => {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link to={Routes.myAccount} className="flex items-center gap-2 text-lg font-semibold md:text-base">
            <Logo />
          </Link>
          <NavLink to={Routes.myAccount} end className={headerNavItemClassname}>
            Dashboard
          </NavLink>
          <NavLink to={Routes.settings} className={headerNavItemClassname}>
            Settings
          </NavLink>
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="grid gap-6 text-lg font-medium">
              <Link to={Routes.myAccount} className="flex items-center gap-2 text-lg font-semibold">
                <Logo />
              </Link>
              <NavLink to={Routes.myAccount} className={sheetNavItemClassname}>
                Dashboard
              </NavLink>
              <NavLink to={Routes.settings} className={sheetNavItemClassname}>
                Settings
              </NavLink>
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <form className="ml-auto flex-1 sm:flex-initial">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search your stuff..."
                className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] py-2"
              />
            </div>
          </form>
          <UserDropdownMenu />
        </div>
      </header>

      {children}
    </div>
  );
};

const headerNavItemClassname = ({ isActive }: NavLinkRenderProps) =>
  isActive
    ? "text-foreground transition-colors hover:text-foreground"
    : "text-muted-foreground transition-colors hover:text-foreground";

const sheetNavItemClassname = ({ isActive }: NavLinkRenderProps) =>
  isActive ? "hover:text-foreground" : "text-muted-foreground hover:text-foreground";
