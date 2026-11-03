import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";
import designSystem from "./eslint-rules/design-system.js";

// Design-system guard rails (PRD A3.2, packages/ui/DESIGN_RULES.md). Token sources and tests are exempt.
const designSystemIgnores = [
  "**/*.test.{ts,tsx}",
  "src/lib/themes.ts",
  "packages/ui/src/tokens/**",
  "packages/ui/scripts/**",
];
const designSystemRules = (severity) => ({
  "pd2-ds/no-raw-color": severity,
  "pd2-ds/no-palette-class": severity,
  "pd2-ds/no-arbitrary-value": severity,
});


/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"]
  },
  {
    languageOptions: { globals: globals.browser }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  prettierConfig,
  {
    plugins: {
      'react-hooks': pluginReactHooks,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'react/jsx-max-props-per-line': [2, { maximum: 1, when: 'always' }],
      'react/jsx-indent-props': [2, 2],
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
      'react/prop-types': 'off', // TypeScript handles prop validation
      'react-hooks/set-state-in-effect': 'warn', // Downgrade to warning
      'no-case-declarations': 'off', // Allow declarations in case blocks
      'no-alert': 'error', // window.alert/confirm/prompt wedge the non-focusable overlay window; use confirmToast()
    },
  },
  {
    // App code runs in the user's WebView2, which can be years old (Edge 112-115 seen in Sentry);
    // Promise.withResolvers needs Chromium 119. Tests run in Node and may use it.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}"],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Promise', property: 'withResolvers', message: 'Needs Chromium 119; older WebView2 runtimes lack it. Use new Promise().' },
      ],
    },
  },
  {
    // Warn-only in the app until each panel is migrated (PRD A5); the design-system package itself must be clean.
    files: ["src/**/*.{ts,tsx}"],
    ignores: designSystemIgnores,
    plugins: { "pd2-ds": designSystem },
    rules: designSystemRules("warn"),
  },
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    ignores: designSystemIgnores,
    plugins: { "pd2-ds": designSystem },
    rules: designSystemRules("error"),
  },
];