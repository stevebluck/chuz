import { Route } from "src/Routes";
import { Link } from "src/components/Link";
import { Card, CardDescription, CardHeader, CardTitle } from "src/components/ui/card";

type Props = {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: Route;
};

export const LinkedCard = ({ icon, to, title, description }: Props) => {
  return (
    <Link
      to={to}
      className="flex flex-col flex-1 rounded-lg border-2 border-b-4 hover:border-primary active:border-b-2 active:mb-[2px] active:translate-y-[2px]"
    >
      <Card className="flex-1 min-h-40 flex border-none">
        <CardHeader className="flex flex-col justify-between flex-1">
          {icon}
          <div className="flex flex-col gap-2">
            <CardTitle className="text-md">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
};
