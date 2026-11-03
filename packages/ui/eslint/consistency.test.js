import { Linter, RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import plugin, { CONSISTENCY_RULES, TOKEN_RULES } from './design-system.js';
import { isPrimitivePackage } from './consistency.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const rules = plugin.rules;

describe('isPrimitivePackage', () => {
  it.each(['@radix-ui/react-dialog', '@radix-ui/react-slot/dist/x', 'radix-ui', 'cmdk', 'sonner', 'vaul', 'class-variance-authority'])(
    '%s is banned',
    (s) => expect(isPrimitivePackage(s)).toBe(true),
  );
  it.each(['@pd2-trader/ui', '@/components/ui/dialog', './sonner', '../ui/cmdk', 'sonner-like', '@radix-uix/foo', 'clsx'])(
    '%s is allowed',
    (s) => expect(isPrimitivePackage(s)).toBe(false),
  );
});

ruleTester.run('no-direct-primitive-import', rules['no-direct-primitive-import'], {
  valid: [
    "import { Button } from '@pd2-trader/ui';",
    "import { toast } from '@/components/ui/sonner';",
    "import { cn } from '@/lib/utils';",
    "// ds-allow: toast shim until @pd2-trader/ui exports it\nimport { toast } from 'sonner';",
  ],
  invalid: [
    {
      code: "import * as DialogPrimitive from '@radix-ui/react-dialog';",
      errors: [{ messageId: 'primitiveImport', data: { source: '@radix-ui/react-dialog' } }],
    },
    { code: "import { Dialog } from 'radix-ui';", errors: [{ messageId: 'primitiveImport' }] },
    { code: "import { toast } from 'sonner';", errors: [{ messageId: 'primitiveImport' }] },
    { code: "import { Command } from 'cmdk';", errors: [{ messageId: 'primitiveImport' }] },
    { code: "import { Drawer } from 'vaul';", errors: [{ messageId: 'primitiveImport' }] },
    { code: "import type { VariantProps } from 'class-variance-authority';", errors: [{ messageId: 'primitiveImport' }] },
    { code: "export { Root } from '@radix-ui/react-tabs';", errors: [{ messageId: 'primitiveImport' }] },
    { code: "export * from 'sonner';", errors: [{ messageId: 'primitiveImport' }] },
    { code: "const m = await import('@radix-ui/react-popover');", errors: [{ messageId: 'primitiveImport' }] },
    { code: "const { toast } = require('sonner');", errors: [{ messageId: 'primitiveImport' }] },
    { code: "type P = import('@radix-ui/react-select').SelectProps;", errors: [{ messageId: 'primitiveImport' }] },
  ],
});

ruleTester.run('no-styled-raw-control', rules['no-styled-raw-control'], {
  valid: [
    '<Button variant="ghost" className="ml-2">Go</Button>',
    '<button onClick={go}>Go</button>',
    '<input type="checkbox" checked={on} onChange={toggle} />',
    // Visually hidden controls driven by a DS component are not styling.
    '<input type="file" className="hidden" ref={fileRef} />',
    '<input className="sr-only" />',
    '<div className="flex gap-2" onClick={select} />',
    '<div role="button" onClick={select} />',
    '<div role="button" className="p-2" />',
    '<Foo.button className="x" />',
    '// ds-allow: native color picker has no DS equivalent yet\n<input type="color" className="h-6 w-6" />',
  ],
  invalid: [
    {
      code: '<button className="px-2 py-1 rounded" onClick={go}>Go</button>',
      errors: [{ messageId: 'styledControl', data: { tag: 'button', component: 'Button' } }],
    },
    {
      code: '<input className={cn("h-8", big && "h-10")} value={v} />',
      errors: [{ messageId: 'styledControl', data: { tag: 'input', component: 'Input' } }],
    },
    { code: '<select style={{ width: 120 }} />', errors: [{ messageId: 'styledControl' }] },
    { code: '<textarea className="w-full" />', errors: [{ messageId: 'styledControl' }] },
    { code: '<input className="hidden md:block" />', errors: [{ messageId: 'styledControl' }] },
    { code: '<input className="hidden" style={{ width: 1 }} />', errors: [{ messageId: 'styledControl' }] },
    {
      code: '<div role="button" onClick={select} className="rounded px-2 hover:bg-accent" />',
      errors: [{ messageId: 'styledRoleButton', data: { tag: 'div' } }],
    },
    { code: '<span role={"button"} onClick={x} style={{ cursor: "pointer" }} />', errors: [{ messageId: 'styledRoleButton' }] },
  ],
});

ruleTester.run('no-local-primitive', rules['no-local-primitive'], {
  valid: [
    "import { Button } from '@pd2-trader/ui';",
    'function TradeCard() { return null; }',
    'const ItemTooltip = () => null;',
    'const PriceTagged = () => null;',
    'function useTooltip() {}',
    'const Button = imported.Button;',
    'const buttonVariants = variants;',
    '// ds-allow: legacy wrapper removed in M2\nconst Badge = () => null;',
    "const Chart = lazy(() => import('./chart'));",
    'const SelectRow = () => null;',
    'export const DialogProvider = ({ children }) => children;',
  ],
  invalid: [
    { code: 'function Button() { return null; }', errors: [{ messageId: 'localPrimitive', data: { name: 'Button' } }] },
    { code: 'export const Badge = (p) => <span {...p} />;', errors: [{ messageId: 'localPrimitive', data: { name: 'Badge' } }] },
    { code: 'const DialogContent = React.forwardRef((p, ref) => null);', errors: [{ messageId: 'localPrimitive' }] },
    { code: 'const SelectTrigger = forwardRef(function SelectTrigger(p, ref) { return null; });', errors: [{ messageId: 'localPrimitive' }] },
    { code: 'const Tooltip = memo(() => null);', errors: [{ messageId: 'localPrimitive' }] },
    { code: 'class Card extends React.Component {}', errors: [{ messageId: 'localPrimitive' }] },
    { code: 'export function PriceTag() { return null; }', errors: [{ messageId: 'localPrimitive', data: { name: 'PriceTag' } }] },
    { code: 'const PanelChromeHeader = () => null;', errors: [{ messageId: 'localPrimitive' }] },
    { code: 'const CardHeader = function () { return null; };', errors: [{ messageId: 'localPrimitive' }] },
    {
      code: "const chipVariants = cva('inline-flex', { variants: { tone: { muted: 'text-muted-foreground' } } });",
      errors: [{ messageId: 'localVariants', data: { fn: 'cva' } }],
    },
  ],
});

describe('configs.plugin', () => {
  it('errors on every rule, including consistency rules', () => {
    const [config] = plugin.configs.plugin;
    for (const name of [...TOKEN_RULES, ...CONSISTENCY_RULES]) expect(config.rules[`pd2-ds/${name}`]).toBe('error');
  });

  it('lints plugin code end to end', () => {
    const linter = new Linter({ configType: 'flat' });
    const messages = linter.verify(
      "import { toast } from 'sonner';\nexport const Button = () => <button className=\"bg-red-500\" />;",
      [
        ...plugin.configs.plugin,
        { languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } } },
      ],
      'plugin/src/panel.tsx',
    );
    expect(messages.map((m) => `${m.ruleId}:${m.severity}`).sort()).toEqual([
      'pd2-ds/no-direct-primitive-import:2',
      'pd2-ds/no-local-primitive:2',
      'pd2-ds/no-palette-class:2',
      'pd2-ds/no-styled-raw-control:2',
    ]);
  });
});
