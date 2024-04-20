import { Button } from "./ui/button";

type Props = {
  children: React.ReactNode;
  preview: React.ReactNode;
  title: string;
  activateButtonLabel: string;
  isActive: boolean;
  isDisabled: boolean;
  onActivate: () => void;
  onCancel: () => void;
};

export const PreviewContent = ({
  activateButtonLabel,
  title,
  isActive,
  isDisabled,
  onCancel,
  onActivate,
  children,
  preview,
}: Props) => {
  return (
    <div className="flex flex-col gap-2 relative">
      {isDisabled && <div className="absolute inset-0 bg-background opacity-50 z-10" />}
      <div className="flex justify-between gap-2 pb-2">
        <h3 className="font-semibold">{title}</h3>
        {isActive ? (
          <Button variant="link" type="button" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button variant="link" type="button" onClick={onActivate}>
            {activateButtonLabel}
          </Button>
        )}
      </div>
      {isActive ? children : preview}
    </div>
  );
};
