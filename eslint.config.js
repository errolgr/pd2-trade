import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";


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
    // A DOM `title` (or SVG <title>) is a native OS tooltip: drawn by the WebView, it can land behind or outside the
    // overlay and ignores the theme. Use <Tip label=…> from '@/components/ui/tooltip'.
    files: ["src/**/*.tsx"],
    rules: {
      'react/forbid-dom-props': [
        'error',
        { forbid: [{ propName: 'title', message: 'Native tooltip: use <Tip label=…> from @/components/ui/tooltip.' }] },
      ],
      'react/forbid-component-props': [
        'error',
        {
          forbid: [
            {
              propName: 'title',
              // Components that pass `title` through to their DOM element (heading-style `title` props elsewhere are fine)
              disallowedFor: ['Button', 'Input', 'Textarea', 'Badge', 'Toggle', 'ToggleGroupItem', 'TabsTrigger', 'CountBadge'],
              message: 'Lands on the DOM as a native tooltip: use <Tip label=…> from @/components/ui/tooltip.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "JSXOpeningElement[name.name='title']", message: 'SVG <title> is a native tooltip: use <Tip label=…>.' },
        {
          selector: "JSXOpeningElement[name.object.name='motion'] > JSXAttribute[name.name='title']",
          message: 'Native tooltip: use <Tip label=…> from @/components/ui/tooltip.',
        },
      ],
    },
  },
];