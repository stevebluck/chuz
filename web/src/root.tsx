import { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import "./style.css";
import { cn } from "./utils";

export const links: LinksFunction = () => {
  return [
    {
      rel: "preload",
      href: "/fonts/inter/Inter-Medium.woff2",
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous",
    },
    {
      rel: "preload",
      href: "/fonts/inter/Inter-Regular.woff2",
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous",
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return {
    theme: "dark",
  };
}

export default function AppWithProviders() {
  const data = useLoaderData<typeof loader>();
  return <App />;
}

export const App = () => {
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en" className={cn("h-full")}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-background h-full font-sans antialiased">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};
