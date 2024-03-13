import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  ssr: {
    noExternal: ["bcryptjs"],
  },
  plugins: [remix({ appDirectory: "src", ssr: true }), tsconfigPaths()],
  build: {
    minify: "terser",
  },
});
