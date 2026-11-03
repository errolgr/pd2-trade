import type { Story, StoryDefault } from '@ladle/react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SettingsGroup,
  SettingsHint,
  SettingsRow,
  SettingsSection,
  SettingsSkeleton,
  Slider,
  Switch,
} from '@pd2-trader/ui';

export default { title: 'Overlay / Settings' } satisfies StoryDefault;

interface Values {
  theme: string;
  transparency: number;
  runeIcons: boolean;
  autoBump: boolean;
  template: string;
}

/** SettingsRow is a FormItem: each row sits in a react-hook-form FormField, as in the overlay settings pages. */
export const Section: Story = () => {
  const form = useForm<Values>({
    defaultValues: { theme: 'sanctuary', transparency: 20, runeIcons: true, autoBump: false, template: 'WTS {item} {price} HR' },
  });
  return (
    <Form {...form}>
      <form className="w-popover rounded-lg border bg-surface p-4">
        <SettingsSection title="Interface"
          description="Theme, transparency and overlay behaviour.">
          <SettingsGroup title="Appearance"
            aside={<span className="text-2xs text-muted-foreground">Applies to all windows</span>}>
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <SettingsRow
                  label="Theme"
                  description="21 themes, light and dark."
                  settingKey="theme"
                  control={
                    <Select value={field.value}
                      onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sanctuary">Sanctuary</SelectItem>
                        <SelectItem value="classic-diablo-ii">Classic Diablo II</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                />
              )}
            />
            <FormField
              control={form.control}
              name="transparency"
              render={({ field }) => (
                <SettingsRow
                  label="Window transparency"
                  control={
                    <FormControl>
                      <Slider className="w-40"
                        max={90}
                        value={[field.value]}
                        onValueChange={([v]) => field.onChange(v)} />
                    </FormControl>
                  }
                />
              )}
            />
            <FormField
              control={form.control}
              name="runeIcons"
              render={({ field }) => (
                <SettingsRow
                  label="Show rune icons"
                  description="Next to rune names in lists."
                  control={
                    <FormControl>
                      <Switch checked={field.value}
                        onCheckedChange={field.onChange} />
                    </FormControl>
                  }
                />
              )}
            />
            <FormField
              control={form.control}
              name="autoBump"
              render={({ field }) => (
                <SettingsRow
                  label="Auto-bump (needs sign-in)"
                  disabled
                  control={
                    <FormControl>
                      <Switch disabled
                        checked={field.value}
                        onCheckedChange={field.onChange} />
                    </FormControl>
                  }
                />
              )}
            />
          </SettingsGroup>
          <SettingsGroup title="Account"
            dimmed>
            <FormField
              control={form.control}
              name="template"
              render={({ field }) => (
                <SettingsRow
                  label="Trade message"
                  description="Placeholders: {item}, {price}, {account}."
                  layout="stacked"
                  control={
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  }
                />
              )}
            />
          </SettingsGroup>
          <SettingsHint>Changes save automatically.</SettingsHint>
        </SettingsSection>
      </form>
    </Form>
  );
};

export const Loading: Story = () => (
  <div className="w-popover rounded-lg border bg-surface p-4">
    <SettingsSkeleton rows={4} />
  </div>
);
