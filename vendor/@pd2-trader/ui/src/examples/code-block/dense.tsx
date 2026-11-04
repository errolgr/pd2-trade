import { CodeBlock } from '@pd2-trader/ui';

export const meta = {
  title: 'Dense, no header',
  description: '`size="2xs"` without a header for overlay panels (raw filter JSON); the copy button floats in the corner. `copyable={false}` hides it.',
  order: 1,
};

const FILTER = JSON.stringify({ name: 'Ber Rune', ladder: true, hardcore: false, maxPrice: '1.2 HR' }, null, 2);

export default function CodeBlockDenseExample() {
  return (
    <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-3">
      <CodeBlock size="2xs"
        code={FILTER} />
      <CodeBlock size="2xs"
        copyable={false}
        code="GET /api/v1/market/listings?item=ber" />
    </div>
  );
}
