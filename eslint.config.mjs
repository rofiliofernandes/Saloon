import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    rules: {
      /*
       * This project contains existing Supabase/API response
       * objects that are not fully typed yet.
       *
       * Keep `any` visible as a warning instead of making
       * the entire lint run fail.
       */
      "@typescript-eslint/no-explicit-any": "warn",

      /*
       * These React 19/Next 16 rules can flag legitimate
       * data-loading effects as errors.
       *
       * Keep them as warnings while we clean the application
       * incrementally.
       */
      "react-hooks/set-state-in-effect": "warn",

      "react-hooks/exhaustive-deps": "warn",
    },
  },

  globalIgnores([
    ".next/**",
    "node_modules/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
