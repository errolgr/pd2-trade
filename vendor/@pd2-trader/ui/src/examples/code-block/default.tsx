import { CodeBlock } from '@pd2-trader/ui';

export const meta = {
  title: 'With title and language',
  description: 'A titled block with a language label and copy button, as used for example sources in the website docs. Long lines scroll.',
  order: 0,
};

const SOURCE = `import { Button } from '@pd2-trader/ui';

export function ListButton() {
  return <Button onClick={() => listItem({ name: 'Harlequin Crest', price: '1.5 HR' })}>List item</Button>;
}`;

export default function CodeBlockExample() {
  return (
    <div className="w-full max-w-xl">
      <CodeBlock title="list-button.tsx"
        language="tsx"
        code={SOURCE} />
    </div>
  );
}
