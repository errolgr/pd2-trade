import { CodeBlock, Tabs, TabsList, TabsTrigger } from '@pd2-trader/ui';
import { useState } from 'react';

export const meta = {
  title: 'Language tabs',
  description: 'Multi-language API example at the docs size (`size="sm"`): a `TabsList` as the `title`, the active tab picks `code` and `language`, which also drives the syntax tinting.',
  order: 2,
};

const TABS = [
  { label: 'curl', language: 'bash', code: 'curl -H "X-API-Key: $PD2_KEY" https://pd2trader.com/api/v1/prices?item=ber' },
  {
    label: 'JavaScript',
    language: 'js',
    code: `const res = await fetch('https://pd2trader.com/api/v1/prices?item=ber', {
  headers: { 'X-API-Key': process.env.PD2_KEY },
});
const { median } = await res.json(); // 1.2 HR`,
  },
  {
    label: 'Python',
    language: 'python',
    code: `import requests
res = requests.get("https://pd2trader.com/api/v1/prices", params={"item": "ber"})
print(res.json()["median"])  # 1.2 HR`,
  },
];

export default function CodeBlockLanguageTabsExample() {
  const [active, setActive] = useState(TABS[0].label);
  const tab = TABS.find((t) => t.label === active) ?? TABS[0];
  return (
    <div className="w-full max-w-xl">
      <Tabs value={active}
        onValueChange={setActive}>
        <CodeBlock
          size="sm"
          code={tab.code}
          language={tab.language}
          title={
            <TabsList aria-label="Code language"
              className="h-8">
              {TABS.map((t) => (
                <TabsTrigger key={t.label}
                  value={t.label}
                  className="text-xs">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          }
        />
      </Tabs>
    </div>
  );
}
