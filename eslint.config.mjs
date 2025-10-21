import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "next-env.d.ts", "scripts/**"],
  },
  {
    files: ["server.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
  {
    // Global rules for all files
    rules: {
      // Allow apostrophes and quotes in JSX text content (safe in React)
      "react/no-unescaped-entities": ["error", { "forbid": [">", "}"] }],
      // Unused vars should be warnings, not errors (allows commented code during development)
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
    },
  },
];

export default eslintConfig;
