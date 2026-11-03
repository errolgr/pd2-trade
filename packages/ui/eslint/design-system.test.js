import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import plugin, { classifyClass } from './design-system.js';

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

describe('classifyClass', () => {
  it.each([
    ['bg-red-500', 'paletteClass'],
    ['hover:text-zinc-400/80', 'paletteClass'],
    ['dark:border-white', 'paletteClass'],
    ['border-t-black', 'paletteClass'],
    ['bg-[#fff]', 'rawColor'],
    ['shadow-[0_0_8px_rgba(0,0,0,0.5)]', 'rawColor'],
    ['text-[oklch(0.7_0.1_200)]', 'rawColor'],
    ['w-[312px]', 'arbitraryValue'],
    ['text-[13px]', 'arbitraryValue'],
    ['md:-mt-[3px]', 'arbitraryValue'],
    ['max-h-[calc(100vh-2rem)]', 'arbitraryValue'],
    ['rounded-[6px]', 'arbitraryValue'],
  ])('%s → %s', (token, kind) => {
    expect(classifyClass(token)).toBe(kind);
  });

  it.each([
    'bg-transparent',
    'text-current',
    'border-inherit',
    'bg-surface',
    'text-q-unique',
    'text-muted-foreground',
    'bg-primary/10',
    'w-[var(--radix-popover-trigger-width)]',
    'max-h-[var(--radix-select-content-available-height)]',
    'z-[60]',
    'rounded-[inherit]',
    'grid-cols-[1fr_auto]',
    'shadow-[var(--shadow-panel)]',
    'p-2',
  ])('%s is allowed', (token) => {
    expect(classifyClass(token)).toBeNull();
  });
});

ruleTester.run('no-palette-class', rules['no-palette-class'], {
  valid: [
    '<div className="bg-surface text-q-unique border-border" />',
    '<div className="bg-transparent text-current border-inherit" />',
    "cn('text-muted-foreground', isOpen && 'bg-accent')",
    // Prose outside class contexts is ignored; only class-shaped strings are checked there.
    "const label = 'Use bg-red-500 for errors';",
    "t('Errors use bg-red-500.')",
    "if (kind === 'bg-red') {}",
    {
      code: '// ds-allow: matches the PD2 website brand swatch\n<div className="bg-red-500" />',
    },
    {
      code: '<div className="text-zinc-400" />',
      options: [{ allow: ['text-zinc-400'] }],
    },
    {
      code: '<div className="text-zinc-400" />',
      options: [{ allow: ['/^text-zinc-/'] }],
    },
  ],
  invalid: [
    {
      code: '<div className="p-2 bg-red-500" />',
      errors: [{ messageId: 'paletteClass', data: { token: 'bg-red-500' } }],
    },
    {
      code: "<div className={cn('p-2', active ? 'text-zinc-400' : 'border-white')} />",
      errors: [{ messageId: 'paletteClass' }, { messageId: 'paletteClass' }],
    },
    {
      code: "cn({ 'hover:bg-green-700/50': on }, ['text-black'])",
      errors: [{ messageId: 'paletteClass' }, { messageId: 'paletteClass' }],
    },
    {
      code: [
        "const buttonVariants = cva('inline-flex', {",
        "  variants: { variant: { danger: 'bg-red-600 text-white', ghost: 'bg-transparent' } },",
        "  compoundVariants: [{ variant: 'danger', className: 'ring-red-400' }],",
        "  defaultVariants: { variant: 'ghost' },",
        '});',
      ].join('\n'),
      errors: [{ messageId: 'paletteClass' }, { messageId: 'paletteClass' }, { messageId: 'paletteClass' }],
    },
    {
      code: '<div className={`flex ${open ? "bg-sky-500" : ""} text-amber-300`} />',
      errors: [
        { messageId: 'paletteClass', data: { token: 'bg-sky-500' } },
        { messageId: 'paletteClass', data: { token: 'text-amber-300' } },
      ],
    },
    {
      // Lookup maps: any class-shaped string counts, whatever the variable is called.
      code: "const ELEMENT_TEXT = { fire: 'text-orange-400', cold: 'font-medium text-sky-300' };",
      errors: [{ messageId: 'paletteClass' }, { messageId: 'paletteClass' }],
    },
    {
      code: "const rowClassName = 'text-emerald-400';",
      errors: [{ messageId: 'paletteClass' }],
    },
    {
      code: "toast('x', { className: 'bg-rose-500' })",
      errors: [{ messageId: 'paletteClass' }],
    },
    {
      code: '<Popover contentClassName="text-slate-300" />',
      errors: [{ messageId: 'paletteClass' }],
    },
    {
      // ds-allow without a reason does not count.
      code: '// ds-allow:\n<div className="bg-red-500" />',
      errors: [{ messageId: 'paletteClass' }],
    },
  ],
});

ruleTester.run('no-raw-color', rules['no-raw-color'], {
  valid: [
    '<div className="bg-surface shadow-[var(--shadow-glow)]" />',
    "<div style={{ color: 'var(--q-unique)' }} />",
    "<div style={{ background: 'color-mix(in oklab, var(--success) 20%, transparent)' }} />",
    '<path fill="currentColor" />',
    '<path fill="url(#grad)" />',
    '<div title="#1 seller" />',
    '{/* ds-allow: game-accurate rune glyph color */}\n<div style={{ color: "#ff8000" }} />',
  ],
  invalid: [
    {
      code: '<div className="bg-[#1a1a1a]" />',
      errors: [{ messageId: 'rawColorClass', data: { token: 'bg-[#1a1a1a]' } }],
    },
    {
      code: "<div className={cn('shadow-[0_0_8px_rgba(0,0,0,0.5)]')} />",
      errors: [{ messageId: 'rawColorClass' }],
    },
    {
      code: "<div style={{ color: '#fff', borderColor: `hsl(0 0% ${l}%)` }} />",
      errors: [{ messageId: 'rawColorValue' }, { messageId: 'rawColorValue' }],
    },
    {
      code: "<div style={{ color: on ? 'oklch(0.7 0.1 200)' : undefined }} />",
      errors: [{ messageId: 'rawColorValue' }],
    },
    {
      code: "const ELEMENT_TEXT = { fire: 'text-[#ff7043]' };",
      errors: [{ messageId: 'rawColorClass', data: { token: 'text-[#ff7043]' } }],
    },
    {
      code: "const RING_MASK: React.CSSProperties = { mask: 'linear-gradient(#000 0 0)' };",
      errors: [{ messageId: 'rawColorValue' }],
    },
    {
      code: "const glowStyle = { boxShadow: `0 0 8px ${c}, 0 0 2px rgb(0 0 0)` };",
      errors: [{ messageId: 'rawColorValue' }],
    },
    {
      code: "<motion.div animate={{ backgroundColor: '#123456' }} />",
      errors: [{ messageId: 'rawColorValue' }],
    },
    {
      code: '<Line stroke="#8884d8" />',
      errors: [{ messageId: 'rawColorValue', data: { token: '#8884d8' } }],
    },
    {
      code: "<Bar fill={'rgb(0 0 0)'} />",
      errors: [{ messageId: 'rawColorValue' }],
    },
  ],
});

ruleTester.run('no-arbitrary-value', rules['no-arbitrary-value'], {
  valid: [
    '<div className="w-[var(--radix-popover-trigger-width)] p-2 text-xs z-[60]" />',
    '<div className="grid-cols-[1fr_auto]" />',
    '// ds-allow: matches the 312px game tooltip width\n<div className="w-[312px]" />',
    '<div className="w-[312px]" /> // ds-allow: game tooltip width',
    // eslint-disable with a reason is the other escape hatch.
    '// eslint-disable-next-line rule-to-test/no-arbitrary-value -- legacy panel, migrates in M2\n<div className="h-[18px]" />',
  ],
  invalid: [
    {
      code: '<div className="text-[13px] w-[312px]" />',
      errors: [
        { messageId: 'arbitraryValue', data: { token: 'text-[13px]' } },
        { messageId: 'arbitraryValue', data: { token: 'w-[312px]' } },
      ],
    },
    {
      code: "const s = cva('px-[7px]', { variants: { size: { sm: 'h-[22px]' } } });",
      errors: [{ messageId: 'arbitraryValue' }, { messageId: 'arbitraryValue' }],
    },
    {
      code: '<div className={`gap-[6px] ${x}`} />',
      errors: [{ messageId: 'arbitraryValue' }],
    },
    {
      code: "<div className={clsx(big && 'max-h-[calc(100vh-2rem)]')} />",
      errors: [{ messageId: 'arbitraryValue' }],
    },
  ],
});
