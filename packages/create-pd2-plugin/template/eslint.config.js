import tseslint from 'typescript-eslint';
import pd2ds from '@pd2-trader/ui/eslint';

// PD2 Trader design rules (DESIGN_RULES.md): the overlay's own pd2-ds rules, every one at error.
export default [
  { ignores: ['dist/**'] },
  ...tseslint.configs.recommended,
  ...pd2ds.configs.plugin,
  {
    rules: {
      // Marketplace review rejects bundles that evaluate strings as code.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
];
