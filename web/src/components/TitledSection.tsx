type Props = {
  title: string;
  children: React.ReactNode;
};

export const TitledSection = ({ title, children }: Props) => {
  return (
    <section className="flex flex-col gap-6 border-b pb-10">
      <header>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </header>
      {children}
    </section>
  );
};
