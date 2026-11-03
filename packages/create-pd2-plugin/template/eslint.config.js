import tseslint from 'typescript-eslint';
import pd2ds from './eslint-rules/design-system.js';

// PD2 Trader design rules (DESIGN_RULES.md): no raw colors, palette classes or arbitrary values. Uses the
// rules package's plugin preset when it has one; otherwise enables every pd2-ds rule at error.
const designRules = pd2ds.configs?.plugin ?? [
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    plugins: { 'pd2-ds': pd2ds },
    rules: Object.fromEntries(Object.keys(pd2ds.rules).map((rule) => [`pd2-ds/${rule}`, 'error'])),
  },
];

export default [
  { ignores: ['dist/**', 'eslint-rules/**'] },
  ...tseslint.configs.recommended,
  ...designRules,
  {
    rules: {
      // Marketplace review rejects bundles that evaluate strings as code.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
];
