/**
 * Local ESLint plugin `pd2-ds`: design-system guard rails (PRD A3.2, A4 "Consistency rule").
 *
 * Token rules (each reports one category so it can be configured or disabled on its own):
 * - `pd2-ds/no-raw-color`      raw colors (#hex, rgb(), hsl(), oklch()…) in class strings, `style`, or color props.
 * - `pd2-ds/no-palette-class`  Tailwind palette color classes (`bg-red-500`, `text-zinc-400`, `border-white`).
 * - `pd2-ds/no-arbitrary-value` bracketed arbitrary values for spacing/size/type/radius/border (`w-[312px]`, `text-[13px]`).
 *
 * Consistency rules (./consistency.js; apply outside packages/ui only):
 * - `pd2-ds/no-direct-primitive-import`, `pd2-ds/no-styled-raw-control`, `pd2-ds/no-local-primitive`.
 *
 * Inspected: `className`/`class`/`*ClassName` JSX attributes, arguments of `cn()`/`clsx()`/`cva()`/`twMerge()`…,
 * variables/properties named `*className`/`*classes`, the `style` attribute (raw colors only), and any JSX
 * attribute whose whole string value is a color (`fill="#fff"`).
 *
 * Escape hatches:
 * - `// ds-allow: <reason>` (or `{/* ds-allow: <reason> *\/}`) on the same line or the line above. A reason is required.
 * - `// eslint-disable-next-line pd2-ds/no-arbitrary-value -- <reason>`.
 * - Rule option `{ allow: ['exact-class', '/regex/'] }` for project-wide exceptions (token rules).
 *
 * `plugin.configs.plugin`: flat config with every rule at error, for plugin code and the create-pd2-plugin template.
 */

import { consistencyRules, dsAllowedLines } from './consistency.js';

const CLASS_FUNCTIONS = new Set(['cn', 'clsx', 'cx', 'cva', 'tv', 'twMerge', 'twJoin', 'classNames', 'classnames']);
/** Functions whose object arguments are variant configs (keys are variant names, not classes). */
const VARIANT_CONFIG_FUNCTIONS = new Set(['cva', 'tv']);

const CLASS_ATTRIBUTE = /^(class|className|[a-zA-Z]+ClassName)$/;
const CLASS_IDENTIFIER = /(className|ClassName|classNames|ClassNames|classes|Classes|Class|CLASS|CLASSES)$/;
/** JSX props whose value is CSS (style objects, framer-motion targets). */
const CSS_ATTRIBUTE = /^(style|animate|initial|exit|whileHover|whileTap|whileFocus|whileInView)$/;
const STYLE_IDENTIFIER = /(style|Style|STYLE|styles|Styles|STYLES)$/;
/** A string made only of lowercase utility-shaped tokens (bracket contents replaced by `[]` first). */
const LOOSE_CLASS_LIST = /^[\sa-z0-9!:\-/.[\]()&_%*>+~@']*-[\sa-z0-9!:\-/.[\]()&_%*>+~@']*$/;

const RAW_COLOR = /#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z_-])|(?<![a-zA-Z-])(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/;
/** A JSX prop whose entire value is a color (`fill="#fff"`, `stroke="rgb(0 0 0)"`). */
const WHOLE_COLOR = /^\s*(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\([^)]*\))\s*$/;

const PALETTE_HUES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe';
const COLOR_UTILITIES =
  'bg|text|border|border-[xytrblse]|ring|ring-offset|outline|divide|fill|stroke|from|via|to|placeholder|caret|accent|decoration|shadow|inset-shadow|inset-ring|drop-shadow|text-shadow';
const PALETTE_CLASS = new RegExp(`^(?:${COLOR_UTILITIES})-(?:(?:${PALETTE_HUES})-(?:50|[1-9]00|950)|white|black)$`);

/** Utilities whose arbitrary values bypass the spacing / size / type / radius / border scales. */
const SCALED_UTILITIES = new RegExp(
  '^(?:' +
    [
      // spacing
      'p[xytrblse]?',
      'm[xytrblse]?',
      'gap(?:-[xy])?',
      'space-[xy]',
      'inset(?:-[xy])?',
      'top|right|bottom|left|start|end',
      'translate-[xy]',
      'scroll-[mp][xytrblse]?',
      'indent',
      // size
      'w|h|min-w|max-w|min-h|max-h|size|basis',
      // typography
      'text|leading|tracking',
      // radius / border width
      'rounded(?:-[a-z]{1,2})?',
      'border(?:-[xytrblse])?',
      'ring(?:-offset)?',
      'outline(?:-offset)?',
      'divide-[xy]',
    ].join('|') +
    ')$',
);

/** Split a class string into tokens, keeping whitespace inside brackets/parens (none in valid Tailwind, but be safe). */
function splitClasses(value) {
  return value.split(/\s+/).filter(Boolean);
}

/** `hover:md:!-bg-red-500/50!` → `bg-red-500/50` (variants, important and negative prefixes removed). */
function baseUtility(token) {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth--;
    else if (ch === ':' && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!/, '').replace(/!$/, '').replace(/^-/, '');
}

/**
 * Value carries no raw number once CSS variable references are removed: `var(--radix-popover-trigger-width)`,
 * `length:var(--x)`, keywords such as `inherit`. These defer to a token, so they are not scale bypasses.
 */
function isTokenReference(value) {
  const stripped = value.replace(/^[a-z-]+:/, '').replace(/var\(--[\w-]+(?:,[^)]*)?\)/g, '');
  return !/\d/.test(stripped);
}

/**
 * Classify one class token.
 * @returns {'rawColor' | 'paletteClass' | 'arbitraryValue' | null}
 */
export function classifyClass(token) {
  const utility = baseUtility(token);
  const open = utility.indexOf('[');
  if (open !== -1) {
    const close = utility.lastIndexOf(']');
    const value = utility.slice(open + 1, close === -1 ? undefined : close);
    if (RAW_COLOR.test(value)) return 'rawColor';
    const prefix = utility.slice(0, open).replace(/-$/, '');
    if (prefix && SCALED_UTILITIES.test(prefix) && !isTokenReference(value)) return 'arbitraryValue';
    return null;
  }
  if (PALETTE_CLASS.test(utility.replace(/\/[\w.[\]%-]+$/, ''))) return 'paletteClass';
  return null;
}

const MESSAGES = {
  rawColor: {
    rawColorClass:
      "Raw color in class '{{token}}'. Use a semantic/domain token class (bg-surface, text-q-unique…); see packages/ui/DESIGN_RULES.md.",
    rawColorValue:
      "Raw color '{{token}}'. Use a theme token (var(--success), bg-surface, text-q-unique…); see packages/ui/DESIGN_RULES.md.",
  },
  paletteClass: {
    paletteClass:
      "Tailwind palette class '{{token}}' ignores the theme. Use a semantic/domain token class (text-muted-foreground, bg-destructive, text-q-set…).",
  },
  arbitraryValue: {
    arbitraryValue:
      "Arbitrary value '{{token}}' bypasses the design scale. Use the Tailwind scale (4px spacing, text-xs…) or add `// ds-allow: <reason>`.",
  },
};

const DOCS = {
  rawColor: 'Disallow raw colors (#hex, rgb(), hsl(), oklch()) in TSX class strings, style and color props',
  paletteClass: 'Disallow Tailwind palette color classes; use semantic/domain token classes',
  arbitraryValue: 'Disallow arbitrary bracket values for spacing, size, font size, radius and border width',
};

function compileAllow(list) {
  return (list ?? []).map((entry) => {
    const m = /^\/(.*)\/([a-z]*)$/.exec(entry);
    return m ? new RegExp(m[1], m[2]) : entry;
  });
}

function createRule(category) {
  return {
    meta: {
      type: 'suggestion',
      docs: { description: DOCS[category] },
      messages: MESSAGES[category],
      schema: [
        {
          type: 'object',
          properties: { allow: { type: 'array', items: { type: 'string' } } },
          additionalProperties: false,
        },
      ],
    },
    create(context) {
      const sourceCode = context.sourceCode ?? context.getSourceCode();
      const allow = compileAllow(context.options[0]?.allow);
      const seen = new Set();

      const allowedLines = dsAllowedLines(sourceCode);

      const isAllowed = (node, token) =>
        allowedLines.has(node.loc.start.line) ||
        allow.some((a) => (typeof a === 'string' ? a === token : a.test(token)));

      const report = (node, messageId, token) => {
        const key = `${node.range[0]}:${messageId}:${token}`;
        if (seen.has(key) || isAllowed(node, token)) return;
        seen.add(key);
        context.report({ node, messageId, data: { token } });
      };

      /** Strings already checked in a class/CSS context, so the catch-all visitors skip them. */
      const handled = new WeakSet();

      /** Check a string that holds Tailwind classes. */
      const checkClassString = (node, value) => {
        handled.add(node);
        for (const token of splitClasses(value)) {
          const kind = classifyClass(token);
          if (kind !== category) continue;
          report(node, kind === 'rawColor' ? 'rawColorClass' : kind, token);
        }
      };

      /** Check a string that holds CSS (style values). */
      const checkCssString = (node, value) => {
        handled.add(node);
        if (category === 'rawColor' && RAW_COLOR.test(value)) report(node, 'rawColorValue', value.trim());
      };

      /**
       * Any other string: check it as classes only if it is shaped like a class list (lowercase utility tokens,
       * bracket contents aside), which catches lookup maps such as `{ fire: 'text-[#ff7043]' }` but skips prose.
       */
      const checkLooseString = (node, value) => {
        if (handled.has(node) || !value.trim()) return;
        if (LOOSE_CLASS_LIST.test(value.replace(/\[[^\]]*\]/g, '[]'))) checkClassString(node, value);
      };

      const calleeName = (node) =>
        node.callee.type === 'Identifier'
          ? node.callee.name
          : node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier'
            ? node.callee.property.name
            : null;

      /**
       * Walk an expression that evaluates to classes (or CSS when `check` is checkCssString).
       * `keysAreClasses`: object keys are class names (clsx style) rather than variant names (cva config).
       */
      const walk = (node, check, keysAreClasses) => {
        if (!node) return;
        switch (node.type) {
          case 'Literal':
            if (typeof node.value === 'string') check(node, node.value);
            return;
          case 'TemplateLiteral':
            for (const quasi of node.quasis) check(quasi, quasi.value.cooked ?? quasi.value.raw);
            for (const expr of node.expressions) walk(expr, check, keysAreClasses);
            return;
          case 'JSXExpressionContainer':
          case 'TSAsExpression':
          case 'TSSatisfiesExpression':
          case 'TSNonNullExpression':
          case 'ChainExpression':
            walk(node.expression, check, keysAreClasses);
            return;
          case 'ConditionalExpression':
            walk(node.consequent, check, keysAreClasses);
            walk(node.alternate, check, keysAreClasses);
            return;
          case 'LogicalExpression':
            if (node.operator !== '&&') walk(node.left, check, keysAreClasses);
            walk(node.right, check, keysAreClasses);
            return;
          case 'BinaryExpression':
            if (node.operator === '+') {
              walk(node.left, check, keysAreClasses);
              walk(node.right, check, keysAreClasses);
            }
            return;
          case 'ArrayExpression':
            for (const el of node.elements) walk(el, check, keysAreClasses);
            return;
          case 'ObjectExpression':
            for (const prop of node.properties) {
              if (prop.type !== 'Property') continue;
              if (keysAreClasses && prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
                check(prop.key, prop.key.value);
              }
              walk(prop.value, check, keysAreClasses);
            }
            return;
          case 'CallExpression': {
            const name = calleeName(node);
            if (check === checkCssString || CLASS_FUNCTIONS.has(name)) walkClassCall(node, check);
            return;
          }
          case 'ArrowFunctionExpression':
            if (node.body.type !== 'BlockStatement') walk(node.body, check, keysAreClasses);
            return;
          default:
            return;
        }
      };

      const walkClassCall = (node, check) => {
        const keysAreClasses = !VARIANT_CONFIG_FUNCTIONS.has(calleeName(node));
        for (const arg of node.arguments) walk(arg, check, keysAreClasses);
      };

      const keyName = (key) =>
        key.type === 'Identifier' ? key.name : key.type === 'Literal' ? String(key.value) : null;

      return {
        JSXAttribute(node) {
          const name = node.name.type === 'JSXIdentifier' ? node.name.name : null;
          if (!name || !node.value) return;
          if (CLASS_ATTRIBUTE.test(name)) {
            walk(node.value, checkClassString, true);
          } else if (CSS_ATTRIBUTE.test(name)) {
            walk(node.value, checkCssString, false);
          } else if (category === 'rawColor') {
            const v = node.value.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
            if (v.type === 'Literal' && typeof v.value === 'string' && WHOLE_COLOR.test(v.value)) {
              checkCssString(v, v.value);
            }
          }
        },
        CallExpression(node) {
          if (CLASS_FUNCTIONS.has(calleeName(node))) walkClassCall(node, checkClassString);
        },
        VariableDeclarator(node) {
          if (node.id.type !== 'Identifier') return;
          if (CLASS_IDENTIFIER.test(node.id.name)) {
            walk(node.init, checkClassString, false);
          } else if (
            STYLE_IDENTIFIER.test(node.id.name) ||
            (node.id.typeAnnotation && /CSSProperties/.test(sourceCode.getText(node.id.typeAnnotation)))
          ) {
            walk(node.init, checkCssString, false);
          }
        },
        Property(node) {
          const name = keyName(node.key);
          if (name && CLASS_IDENTIFIER.test(name)) walk(node.value, checkClassString, false);
        },
        Literal(node) {
          if (typeof node.value === 'string') checkLooseString(node, node.value);
        },
        TemplateElement(node) {
          checkLooseString(node, node.value.cooked ?? node.value.raw);
        },
      };
    },
  };
}

const plugin = {
  meta: { name: 'pd2-ds' },
  rules: {
    'no-raw-color': createRule('rawColor'),
    'no-palette-class': createRule('paletteClass'),
    'no-arbitrary-value': createRule('arbitraryValue'),
    ...consistencyRules,
  },
};

/** Token rules: everywhere, including packages/ui. */
export const TOKEN_RULES = ['no-raw-color', 'no-palette-class', 'no-arbitrary-value'];
/** Consistency rules: everywhere except packages/ui, which is where primitives live. */
export const CONSISTENCY_RULES = Object.keys(consistencyRules);

/** `{ 'pd2-ds/<rule>': severity }` for the given rule names. */
export const pd2dsRules = (names, severity) => Object.fromEntries(names.map((name) => [`pd2-ds/${name}`, severity]));

plugin.configs = {
  /** Plugin code (first-party plugins, create-pd2-plugin template): every rule is an error. */
  plugin: [
    {
      files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
      ignores: ['**/*.test.{js,jsx,ts,tsx}'],
      plugins: { 'pd2-ds': plugin },
      rules: pd2dsRules([...TOKEN_RULES, ...CONSISTENCY_RULES], 'error'),
    },
  ],
};

export default plugin;
