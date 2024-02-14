import { ActionFunctionArgs } from "@remix-run/node";
import { createThemeAction } from "remix-themes";
import { themeSessionResolver } from "~/remix/Sessions.server";

export const action = (args: ActionFunctionArgs) => createThemeAction(themeSessionResolver)(args);
