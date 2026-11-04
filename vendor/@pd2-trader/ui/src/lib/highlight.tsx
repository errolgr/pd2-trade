import type { ReactNode } from 'react';

/**
 * Dependency-free syntax tinting for CodeBlock: one regex per language, tokens colored with theme tokens only.
 * Covers what docs and API examples show (JSON, shell, JS/TS, Python); any other language renders as plain text.
 */

const STRING = String.raw`"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'`;
const NUMBER = String.raw`\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b`;

const JS_KEYWORDS =
  'const|let|var|function|return|await|async|import|from|export|default|new|if|else|for|of|in|try|catch|finally|throw|typeof|class|extends|interface|type|as|while|switch|case|break|continue';
const PY_KEYWORDS =
  'import|from|as|def|return|if|elif|else|for|in|while|try|except|finally|raise|with|class|lambda|not|and|or|is|pass|print';

type TokenKind = 'comment' | 'string' | 'number' | 'literal' | 'keyword' | 'fn' | 'prop' | 'flag' | 'variable';

const GRAMMARS: Record<string, [TokenKind, string][]> = {
  json: [
    ['prop', String.raw`"(?:[^"\\\n]|\\.)*"(?=\s*:)`],
    ['string', STRING],
    ['number', NUMBER],
    ['literal', String.raw`\b(?:true|false|null)\b`],
  ],
  bash: [
    ['comment', String.raw`(?<=^|\s)#[^\n]*`],
    ['string', STRING],
    ['variable', String.raw`\$\{?[A-Za-z_][\w]*\}?`],
    ['keyword', String.raw`(?<=^|[\s;|&(])(?:curl|npm|pnpm|yarn|bun|npx|node|python3?|pip3?|jq|export|echo|cd)\b`],
    ['flag', String.raw`(?<=\s)--?[A-Za-z][\w-]*`],
    ['number', NUMBER],
  ],
  js: [
    ['comment', String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`],
    ['string', `${STRING}|\`(?:[^\`\\\\]|\\\\.)*\``],
    ['keyword', String.raw`\b(?:${JS_KEYWORDS})\b`],
    ['literal', String.raw`\b(?:true|false|null|undefined|this)\b`],
    ['fn', String.raw`\b[A-Za-z_$][\w$]*(?=\s*\()`],
    ['number', NUMBER],
  ],
  python: [
    ['comment', String.raw`#[^\n]*`],
    ['string', String.raw`[fbr]?(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')`],
    ['keyword', String.raw`\b(?:${PY_KEYWORDS})\b`],
    ['literal', String.raw`\b(?:True|False|None|self)\b`],
    ['fn', String.raw`\b[A-Za-z_]\w*(?=\s*\()`],
    ['number', NUMBER],
  ],
};

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'js',
  typescript: 'js',
  javascript: 'js',
  jsx: 'js',
  tsx: 'js',
  sh: 'bash',
  shell: 'bash',
  curl: 'bash',
  py: 'python',
};

const TOKEN_CLASS: Record<TokenKind, string> = {
  comment: 'text-muted-foreground italic',
  string: 'text-success',
  number: 'text-warning',
  literal: 'text-warning',
  keyword: 'text-glow',
  fn: 'text-info',
  prop: 'text-chart-2',
  flag: 'text-chart-4',
  variable: 'text-chart-4',
};

interface Grammar {
  kinds: TokenKind[];
  re: RegExp;
}

const compiled: Record<string, Grammar> = {};

function grammarFor(language: string | undefined): Grammar | null {
  if (!language) return null;
  const key = LANGUAGE_ALIASES[language] ?? language;
  const rules = GRAMMARS[key];
  if (!rules) return null;
  compiled[key] ??= {
    kinds: rules.map(([kind]) => kind),
    re: new RegExp(rules.map(([, src]) => `(${src})`).join('|'), 'gm'),
  };
  return compiled[key];
}

/** Split `code` into `{ text, kind }` tokens (kind undefined = plain). Unknown languages return one plain token. */
function tokenizeCode(code: string, language: string | undefined): { text: string; kind?: TokenKind }[] {
  const grammar = grammarFor(language);
  if (!grammar) return code ? [{ text: code }] : [];
  const out: { text: string; kind?: TokenKind }[] = [];
  let last = 0;
  for (const m of code.matchAll(grammar.re)) {
    if (m[0] === '' || m.index === undefined) continue;
    if (m.index > last) out.push({ text: code.slice(last, m.index) });
    const group = m.findIndex((g, i) => i > 0 && g !== undefined);
    out.push({ text: m[0], kind: grammar.kinds[group - 1] });
    last = m.index + m[0].length;
  }
  if (last < code.length) out.push({ text: code.slice(last) });
  return out;
}

/** `code` as React nodes with token spans. */
function highlightCode(code: string, language: string | undefined): ReactNode[] {
  let offset = 0;
  return tokenizeCode(code, language).map(({ text, kind }) => {
    const key = offset;
    offset += text.length;
    return kind ? (
      <span key={key}
        className={TOKEN_CLASS[kind]}>
        {text}
      </span>
    ) : (
      text
    );
  });
}

export { highlightCode, tokenizeCode };
export type { TokenKind };
