import { LinksFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { Effect } from "effect";
import { Runtime } from "./server/Runtime.server";
import { Sessions } from "./server/Sessions";
import { cn } from "./styles/classnames";
import "./styles/style.css";

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

export const loader = Runtime.loader(
  "Root",
  Sessions.getSession.pipe(
    Effect.map((session) => ({ name: session.user.value.firstName })),
    Effect.catchTag("NoSuchSession", () => Effect.succeed({ name: "Guest" })),
  ),
);

export default function AppWithProviders() {
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
        <div>Hello {data.name}!</div>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};
