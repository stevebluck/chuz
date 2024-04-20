import { Form } from "@remix-run/react";
import { CircleUser } from "lucide-react";
import { Routes } from "src/Routes";
import { Link } from "src/components/Link";
import { Button } from "src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu";

export const UserDropdownMenu = () => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="rounded-full">
        <CircleUser className="h-5 w-5" />
        <span className="sr-only">Toggle user menu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>My Account</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link to={Routes.account.home}>Account</Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <Form method="POST" action={Routes.logout} className="flex flex-col flex-1">
        <DropdownMenuItem asChild>
          <button type="submit" className="text-left cursor-default">
            Logout
          </button>
        </DropdownMenuItem>
      </Form>
    </DropdownMenuContent>
  </DropdownMenu>
);
