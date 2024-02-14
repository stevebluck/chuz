import { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from "remix-themes";
import { Routes } from "./Routes";
import { cn } from "./lib/utils";
import { themeSessionResolver } from "./remix/Sessions.server";
import "./style.css";

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
  const { getTheme } = await themeSessionResolver(request);
  const theme = getTheme();

  return {
    theme,
  };
}

export default function AppWithProviders() {
  const data = useLoaderData<typeof loader>();
  return (
    <ThemeProvider specifiedTheme={data.theme} themeAction={Routes.setTheme}>
      <App />
    </ThemeProvider>
  );
}

export const App = () => {
  const data = useLoaderData<typeof loader>();
  const [theme] = useTheme();

  return (
    <html lang="en" className={cn(theme, "h-full")}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
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
