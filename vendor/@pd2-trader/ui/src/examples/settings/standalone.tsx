import { SettingsGroup, SettingsHint, SettingsRow, SettingsSection, Switch } from '@pd2-trader/ui';
import { useState } from 'react';

export const meta = {
  title: 'Standalone (no form)',
  description:
    'Rows bound to plain state, without react-hook-form: pass `controlId` and give the control the same `id` so the label toggles it. Use it for small settings blocks on the website.',
  order: 1,
};

export default function SettingsStandaloneExample() {
  const [runeIcons, setRuneIcons] = useState(true);
  const [hellOnly, setHellOnly] = useState(false);
  return (
    <div className="w-popover rounded-lg border bg-surface p-4">
      <SettingsSection title="Market"
        description="How listings show up in the browser.">
        <SettingsGroup title="Display">
          <SettingsRow
            label="Show rune icons"
            description="Next to rune names like Ber and Jah."
            controlId="rune-icons"
            settingKey="runeIcons"
            control={
              <Switch id="rune-icons"
                aria-describedby="rune-icons-description"
                checked={runeIcons}
                onCheckedChange={setRuneIcons} />
            }
          />
          <SettingsRow
            label="Hell difficulty only"
            controlId="hell-only"
            control={<Switch id="hell-only"
              checked={hellOnly}
              onCheckedChange={setHellOnly} />}
          />
        </SettingsGroup>
        <SettingsHint>Saved in this browser.</SettingsHint>
      </SettingsSection>
    </div>
  );
}
