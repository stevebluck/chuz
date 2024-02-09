import type { MetaFunction } from "@remix-run/node";
import { ModeToggle } from "~/components/mode-toggle";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => {
  return [
    { title: "Chuzwozza" },
    { name: "description", content: "Development" },
  ];
};

export default function Index() {
  return (
    <div>
      <h1>Welcome to Remix</h1>
      <Button>Hello!</Button>

      <ModeToggle />
    </div>
  );
}
