import { Action } from "./Action";
import { Core } from "./Core";
import { Loader } from "./Loader";

export const Remix = {
  loader: (name: string, route: string) => {
    return new Loader({ name, route }, Core.makeLayer);
  },

  action: (name: string, route: string) => {
    return new Action({ name, route }, Core.makeLayer);
  },
};
