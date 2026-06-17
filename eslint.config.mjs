import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Existing patterns (hydration, URL params, theme) — tighten incrementally
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      // Allow intentional unused: `_`-prefixed names and rest-sibling omits
      // (e.g. `const { dropped: _x, ...rest } = obj`).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "_imported/**",
    "perf-baseline/**",
    "scripts/**",
    "tmp/**",
    // Standalone design mockups — not part of the shipped app.
    "design-handoff/**",
  ]),
]);

export default eslintConfig;
