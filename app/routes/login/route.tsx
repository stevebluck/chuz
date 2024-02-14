import { Link } from "@remix-run/react";
import { Effect } from "effect";
import { Routes } from "~/Routes";
import { buttonVariants } from "~/components/ui/button";
import { Credentials } from "~/core";
import { cn } from "~/lib/utils";
import { Remix } from "~/remix/Remix.server";
import { Response } from "~/remix/Response.sever";
import { LoginForm } from "./login-form";

export const action = Remix.action(Credentials.Plain.parse, (input, { users, sessions }) =>
  Effect.gen(function* (_) {
    const session = yield* _(
      users.authenticate(input),
      Effect.mapError(() => Response.ValidationError({ errors: { form: ["Credentials not recgonised"] } })),
    );

    yield* _(sessions.mint(session));

    // TODO: go to dashboard
    return Response.Redirect({ route: Routes.home });
  }),
);

export const loader = Remix.loader(({ sessions }) =>
  Effect.match(sessions.get, {
    // TODO: go to dashboard
    onSuccess: () => Response.Redirect({ route: Routes.home }),
    onFailure: () => Response.Ok(),
  }),
);

export default function AuthenticationPage() {
  return (
    <div className="flex min-h-full flex-1">
      <div className="container relative hidden flex-1 flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <Link
          to="/examples/authentication"
          className={cn(buttonVariants({ variant: "ghost" }), "absolute right-4 top-4 md:right-8 md:top-8")}
        >
          Login
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
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
