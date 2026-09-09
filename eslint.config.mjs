import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  {
    rules: {
      // The React Compiler rules below flag patterns this app uses on purpose
      // and cannot be suppressed inline (the plugin strips the directives), so
      // they are configured here as warnings rather than build-blocking errors.
      //
      // purity: `useAppStore.getState()` inside async click handlers. Those run
      // after render, so there is no snapshot to tear.
      //
      // set-state-in-effect: gating on zustand/persist hydration, and mirroring
      // externally-changed store values into form inputs. Both are the patterns
      // zustand documents.
      //
      // Revisit if React Compiler is ever enabled for this project.
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
