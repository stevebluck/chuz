import { Route } from "src/Routes";
import { Link } from "./Link";
import { buttonVariants } from "./ui/button";

type Props = {
  children: React.ReactNode;
  preview: React.ReactNode;
  title: string;
  activateButtonLabel: string;
  isActive: boolean;
  isDisabled: boolean;
  activateRoute: Route;
  cancelRoute: Route;
};

export const PreviewContent = ({
  activateButtonLabel,
  title,
  isActive,
  isDisabled,
  activateRoute,
  cancelRoute,
  children,
  preview,
}: Props) => {
  return (
    <div className="flex flex-col gap-2 relative">
      {isDisabled && <div className="absolute inset-0 bg-background opacity-50 z-10" />}
      <div className="flex justify-between gap-2 pb-2">
        <h3 className="font-semibold">{title}</h3>
        {isActive ? (
          <Link className={buttonVariants({ variant: "link" })} to={cancelRoute}>
            Cancel
          </Link>
        ) : (
          <Link className={buttonVariants({ variant: "link" })} to={activateRoute}>
            {activateButtonLabel}
          </Link>
        )}
      </div>
      {isActive ? children : preview}
    </div>
  );
};
