import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import { cjsInterop } from "vite-plugin-cjs-interop";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cjsInterop({
      dependencies: ["pg"],
    }),
    remix({ appDirectory: "src" }),
    tsconfigPaths(),
  ],
  build: {
    target: "esnext",
    minify: "terser",
  },
});
