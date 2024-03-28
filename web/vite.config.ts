import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import { cjsInterop } from "vite-plugin-cjs-interop";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cjsInterop({
      dependencies: ["pg"],
    }),
    remix({ appDirectory: "src" }),
    tsconfigPaths(),
    babel({
      apply: "build",
      babelConfig: {
        plugins: ["annotate-pure-calls"],
      },
    }),
  ],

  build: {
    target: "esnext",
    minify: "terser",
    rollupOptions: {
      external: ["crypto"],
    },
  },
});
