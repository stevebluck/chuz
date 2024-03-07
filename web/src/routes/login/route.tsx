import { Response } from "@chuz/app";
import { Capabilities, Sessions } from "@chuz/core";
import { Credentials } from "@chuz/domain";
import { Link, useActionData, useLoaderData } from "@remix-run/react";
import { Effect } from "effect";
import { RemixServer } from "src/Remix.server";
import { Routes } from "src/Routes";
import { buttonVariants } from "web/components/ui/button";
import { cn } from "web/utils";
import { LoginForm } from "./login-form";

export const action = RemixServer.action(Credentials.Plain, (credentials) =>
  Capabilities.pipe(
    Effect.flatMap(({ users }) => users.authenticate(credentials)),
    Effect.flatMap(() => Response.Redirect.make(Routes.myAccount)),
    Effect.catchTags({
      CredentialsNotRecognised: () => Effect.fail("Credentials not recognised"),
    }),
  ),
);

export const loader = RemixServer.loader(
  Sessions.pipe(
    Effect.tap((sessions) => sessions.guest),
    Effect.asUnit,
    Effect.catchTags({
      Unauthorised: () => Response.Redirect.make(Routes.myAccount),
    }),
  ),
);

export default function LoginPage() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();

  return (
    <div className="flex min-h-full flex-1">
      <div className="container relative flex-1 flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <Link
          to="/register"
          className={cn(buttonVariants({ variant: "ghost" }), "absolute right-4 top-4 md:right-8 md:top-8")}
        >
          Create an account
        </Link>
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
          <div className="absolute inset-0 bg-zinc-900" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            Chuz
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">&ldquo;The most effective way to learn anything really fast.&rdquo;</p>
              <footer className="text-sm">Toby Lerone</footer>
            </blockquote>
          </div>
        </div>
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Sign in to your account</h1>
              <p className="text-sm text-muted-foreground">Lets get back to learning!</p>
            </div>
            <div>
              <div>
                <h6>Loader data:</h6>
                <pre>{JSON.stringify(data, null, 2)}</pre>
              </div>
              <div>
                <h6>Action data:</h6>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
