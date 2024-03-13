import { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { Sessions } from "core/index";
import { Effect, Option } from "effect";
import { RemixServer } from "./server/Remix.server";
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

export const loader = RemixServer.loader(
  "Root",
  Sessions.pipe(
    Effect.flatMap((sessions) => sessions.getSession),
    Effect.map(
      Option.match({
        onSome: (session) => ({ name: session.user.value.firstName }),
        onNone: () => ({ name: "Guest" }),
      }),
    ),
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
