import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import { cjsInterop } from "vite-plugin-cjs-interop";
import EntryShakingPlugin from "vite-plugin-entry-shaking";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    cjsInterop({
      dependencies: ["pg"],
    }),
    remix({
      appDirectory: "src",
      future: {
        unstable_singleFetch: true,
        v3_throwAbortReason: true,
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
      },
    }),
    tsconfigPaths(),
    babel({
      apply: "build",
      babelConfig: {
        babelrc: false,
        configFile: false,
        plugins: ["annotate-pure-calls"],
      },
    }),
    EntryShakingPlugin({
      targets: ["@chuz/prelude"],
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
