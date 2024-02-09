export default {
  plugins: [
    "prettier-plugin-tailwindcss",
    "@trivago/prettier-plugin-sort-imports",
  ],
  tailwindFunctions: ["clsx"],
  importOrder: ["^@core/(.*)$", "^@ui/(.*)$", "^[./]"],
};
