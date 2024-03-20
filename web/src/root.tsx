import { LinksFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { Effect, Option } from "effect";
import { App, Sessions } from "./server";
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

export const loader = App.loader(
  "Root",
  Sessions.getSession.pipe(
    Effect.map((session) => ({ name: Option.getOrElse(session.user.value.firstName, () => "Mr NoName") })),
    Effect.catchTag("NoSuchSession", () => Effect.succeed({ name: "Guest" })),
  ),
);

export default () => {
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
