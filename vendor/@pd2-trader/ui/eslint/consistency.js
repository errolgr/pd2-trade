/**
 * `pd2-ds` consistency rules (PRD A4 "Consistency rule"): every interface composes from `@pd2-trader/ui`
 * components, so feature and plugin code may not reach for the primitives underneath or grow its own.
 *
 * - `pd2-ds/no-direct-primitive-import` imports of `@radix-ui/*`, `radix-ui`, `cmdk`, `sonner`, `vaul`,
 *   `class-variance-authority` (static, dynamic, re-export, require).
 * - `pd2-ds/no-styled-raw-control` `<button>`, `<input>`, `<select>`, `<textarea>` and `role="button"` elements with
 *   `onClick`, when they carry `className`/`style`. A visually hidden control (`className="hidden"`/`"sr-only"`) is fine.
 * - `pd2-ds/no-local-primitive` component definitions named like a DS primitive or one of its parts (`Button`,
 *   `DialogContent`, `PriceTag`…) and any `cva()`/`tv()` call.
 *
 * The rules do not inspect file paths: eslint.config.js scopes them to everything outside packages/ui.
 * Escape hatch, same as the token rules: `// ds-allow: <reason>` on the same line or the line above.
 */

/** Lines covered by a `ds-allow: <reason>` comment (its own line and the next). A reason is required. */
export function dsAllowedLines(sourceCode) {
  const lines = new Set();
  for (const comment of sourceCode.getAllComments()) {
    if (/^\s*ds-allow:\s*\S/.test(comment.value)) {
      lines.add(comment.loc.end.line);
      lines.add(comment.loc.end.line + 1);
    }
  }
  return lines;
}

const PRIMITIVE_PACKAGES = ['radix-ui', 'cmdk', 'sonner', 'vaul', 'class-variance-authority'];

/** Package name of a module specifier, or null for relative/aliased paths (`@radix-ui/react-dialog/x` → `@radix-ui/react-dialog`). */
function packageName(specifier) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

export function isPrimitivePackage(specifier) {
  const name = packageName(specifier);
  return name !== null && (name.startsWith('@radix-ui/') || PRIMITIVE_PACKAGES.includes(name));
}

const noDirectPrimitiveImport = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow importing Radix, cmdk, sonner, vaul or class-variance-authority outside @pd2-trader/ui',
    },
    messages: {
      primitiveImport:
        "'{{source}}' is a design-system internal. Import the component from @pd2-trader/ui (or add it there); see packages/ui/DESIGN_RULES.md.",
    },
    schema: [],
  },
  create(context) {
    const allowedLines = dsAllowedLines(context.sourceCode ?? context.getSourceCode());
    const check = (sourceNode) => {
      if (!sourceNode || sourceNode.type !== 'Literal' || typeof sourceNode.value !== 'string') return;
      if (!isPrimitivePackage(sourceNode.value) || allowedLines.has(sourceNode.loc.start.line)) return;
      context.report({ node: sourceNode, messageId: 'primitiveImport', data: { source: sourceNode.value } });
    };
    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
      TSImportType(node) {
        // typescript-eslint 8.x: `source` (Literal); older versions: `argument` (TSLiteralType).
        const arg = node.source ?? node.argument;
        check(arg?.type === 'TSLiteralType' ? arg.literal : arg);
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') check(node.arguments[0]);
      },
    };
  },
};

const RAW_CONTROLS = new Set(['button', 'input', 'select', 'textarea']);
const STYLE_ATTRIBUTES = new Set(['className', 'class', 'style']);
/** Classes that only hide a control (e.g. a file input driven by a DS Button) rather than style it. */
const HIDING_CLASSES = new Set(['hidden', 'sr-only']);

function attribute(node, name) {
  return node.attributes.find((a) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === name);
}

function staticString(attr) {
  if (!attr?.value) return null;
  const v = attr.value.type === 'JSXExpressionContainer' ? attr.value.expression : attr.value;
  if (v.type === 'Literal' && typeof v.value === 'string') return v.value;
  if (v.type === 'TemplateLiteral' && v.expressions.length === 0) return v.quasis[0].value.cooked;
  return null;
}

const noStyledRawControl = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow styling raw <button>/<input>/<select>/<textarea> or role="button" elements; use DS components' },
    messages: {
      styledControl:
        'Styled raw <{{tag}}>. Use the @pd2-trader/ui {{component}} component instead of restyling the native element.',
      styledRoleButton:
        '<{{tag}} role="button" onClick> with styling is a hand-rolled button. Use the @pd2-trader/ui Button component.',
    },
    schema: [],
  },
  create(context) {
    const allowedLines = dsAllowedLines(context.sourceCode ?? context.getSourceCode());
    const COMPONENT = { button: 'Button', input: 'Input', select: 'Select', textarea: 'Textarea' };
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        const tag = node.name.name;
        const isControl = RAW_CONTROLS.has(tag);
        const isRoleButton =
          !isControl && /^[a-z]/.test(tag) && staticString(attribute(node, 'role')) === 'button' && attribute(node, 'onClick');
        if (!isControl && !isRoleButton) return;

        const styling = node.attributes.filter(
          (a) => a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && STYLE_ATTRIBUTES.has(a.name.name),
        );
        if (styling.length === 0) return;
        const onlyHides = styling.every((a) => {
          if (a.name.name === 'style') return false;
          const value = staticString(a);
          return value !== null && value.trim() !== '' && value.trim().split(/\s+/).every((c) => HIDING_CLASSES.has(c));
        });
        if (onlyHides || allowedLines.has(node.loc.start.line)) return;

        context.report(
          isControl
            ? { node, messageId: 'styledControl', data: { tag, component: COMPONENT[tag] } }
            : { node, messageId: 'styledRoleButton', data: { tag } },
        );
      },
    };
  },
};

/**
 * DS primitives and domain/overlay components (PRD A2). A local component with one of these names, or a part of one
 * (`DialogContent`, `SelectTrigger`, `CardHeader`), is a second copy of the design system.
 */
export const DS_COMPONENT_NAMES = [
  // primitives (A2.1)
  'Accordion', 'Alert', 'AlertDialog', 'Avatar', 'Badge', 'Breadcrumb', 'Button', 'ButtonGroup', 'Calendar', 'Card',
  'Carousel', 'Chart', 'Checkbox', 'Collapsible', 'Command', 'ContextMenu', 'Dialog', 'Drawer', 'DropdownMenu', 'Form',
  'HoverCard', 'Input', 'InputOtp', 'Kbd', 'Label', 'Menubar', 'NavigationMenu', 'Pagination', 'Popover', 'Progress',
  'RadioGroup', 'Resizable', 'ScrollArea', 'ScrollBar', 'Select', 'Separator', 'Sheet', 'Sidebar', 'Skeleton', 'Slider',
  'Sonner', 'Spinner', 'Switch', 'Table', 'TableRow', 'Tabs', 'Textarea', 'Toast', 'Toaster', 'Toggle', 'ToggleGroup',
  'Tooltip', 'TooltipProvider', 'SidebarProvider', 'ToastProvider',
  // overlay patterns (A2.2)
  'PanelChrome', 'HoverPopover', 'PopoverParts', 'SettingsSection', 'SettingsRow', 'EmptyState', 'ErrorChip',
  // domain components (A2.3)
  'ItemName', 'PriceTag', 'RuneIcon', 'CurrencyAmount', 'StatLine', 'MarketRow', 'SparkChart',
  // slot components (A2.4)
  'SlotSection', 'SlotBadge', 'SlotColumn', 'SlotAction',
];

/**
 * Part names (`<Primitive><Part>`). Generic `Row`/`Provider` are left out on purpose: `SelectRow` (a settings row
 * holding a Select) and `DialogProvider` (an app dialog manager) are compositions; the real parts are listed above.
 */
const PART_SUFFIXES = [
  'Action', 'Anchor', 'Arrow', 'Body', 'Cancel', 'Caption', 'Cell', 'Close', 'Content', 'Description', 'Empty',
  'Footer', 'Group', 'Head', 'Header', 'Icon', 'Indicator', 'Item', 'Label', 'Link', 'List', 'Overlay', 'Portal',
  'Root', 'Separator', 'Shortcut', 'Sub', 'SubContent', 'SubTrigger', 'Thumb', 'Title', 'Track',
  'Trigger', 'Value', 'Viewport', 'CheckboxItem', 'RadioItem', 'RadioGroup', 'ScrollUpButton', 'ScrollDownButton',
];

const PRIMITIVE_NAME = new RegExp(`^(?:${DS_COMPONENT_NAMES.join('|')})(?:${PART_SUFFIXES.join('|')})?$`);

/** `forwardRef(...)`, `React.memo(...)`, `styled.button\`\`` produce a component (`lazy()`/aliases only rename one). */
const COMPONENT_WRAPPERS = new Set(['forwardRef', 'memo', 'styled']);

function wrapperName(node) {
  const callee = node.type === 'CallExpression' ? node.callee : node.type === 'TaggedTemplateExpression' ? node.tag : null;
  if (!callee) return null;
  let target = callee;
  while (target.type === 'CallExpression') target = target.callee;
  if (target.type === 'Identifier') return target.name;
  if (target.type === 'MemberExpression') {
    // React.forwardRef / styled.button
    if (target.property.type === 'Identifier' && COMPONENT_WRAPPERS.has(target.property.name)) return target.property.name;
    if (target.object.type === 'Identifier') return target.object.name;
  }
  return null;
}

function definesComponent(init) {
  if (!init) return false;
  if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression' || init.type === 'ClassExpression') {
    return true;
  }
  return COMPONENT_WRAPPERS.has(wrapperName(init));
}

const noLocalPrimitive = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow defining DS primitives (Button, Dialog, PriceTag…) or cva() variants outside @pd2-trader/ui' },
    messages: {
      localPrimitive:
        "Local component '{{name}}' duplicates a design-system component. Use @pd2-trader/ui, or add/extend it in packages/ui.",
      localVariants:
        '{{fn}}() defines component variants outside the design system. New primitives and variants go in packages/ui.',
    },
    schema: [],
  },
  create(context) {
    const allowedLines = dsAllowedLines(context.sourceCode ?? context.getSourceCode());
    const report = (node, messageId, data) => {
      if (!allowedLines.has(node.loc.start.line)) context.report({ node, messageId, data });
    };
    const checkName = (idNode) => {
      if (idNode?.type === 'Identifier' && PRIMITIVE_NAME.test(idNode.name)) {
        report(idNode, 'localPrimitive', { name: idNode.name });
      }
    };
    return {
      FunctionDeclaration: (node) => checkName(node.id),
      ClassDeclaration: (node) => checkName(node.id),
      VariableDeclarator(node) {
        if (definesComponent(node.init)) checkName(node.id);
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && (node.callee.name === 'cva' || node.callee.name === 'tv')) {
          report(node, 'localVariants', { fn: node.callee.name });
        }
      },
    };
  },
};

export const consistencyRules = {
  'no-direct-primitive-import': noDirectPrimitiveImport,
  'no-styled-raw-control': noStyledRawControl,
  'no-local-primitive': noLocalPrimitive,
};
