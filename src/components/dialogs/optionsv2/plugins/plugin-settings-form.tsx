import React from 'react';
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
  Switch,
  SettingsGroup,
  SettingsRow,
} from '@pd2-trader/ui';
import { pluginHost, type PluginView } from '@/plugins/host/manager';
import { useTranslation } from '@/i18n';
import { coerceFieldValue, fieldDisplayValue, schemaFields, type SchemaField, type SettingValue } from './schema-form';

/** True when the plugin asks for a settings section (B5) and declares a settings schema. */
export function hasSettingsSection(view: PluginView): boolean {
  return !!view.manifest?.slots.includes('settings.section') && !!view.manifest.settings;
}

/**
 * B5: a plugin's settings rendered from its JSON-schema subset; every valid change is saved through the host
 * (which coerces to the schema and forwards the values to the running plugin). Titles/descriptions are plugin
 * text.
 */
export function PluginSettingsForm({ view }: { view: PluginView }) {
  const { t } = useTranslation('plugins');
  // Only gives the rows their FormItem/FormControl wiring: values live in the plugin host.
  const form = useForm<Record<string, string>>();
  // Text/number input while it is being edited (it may not be a valid value yet).
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const fields = React.useMemo(() => schemaFields(view.manifest?.settings), [view.manifest]);
  const id = view.installed.id;
  const values = pluginHost.pluginSettings(id);

  const save = (field: SchemaField, raw: string | boolean) => {
    const value = coerceFieldValue(field, raw);
    if (value !== undefined) pluginHost.setPluginSettings(id, { ...pluginHost.pluginSettings(id), [field.key]: value });
  };
  const setDraft = (key: string, text: string | undefined) =>
    setDrafts((prev) => {
      const next = { ...prev };
      if (text === undefined) delete next[key];
      else next[key] = text;
      return next;
    });

  const invalidHint = (field: SchemaField): string => {
    if (field.kind === 'text') return t('settings.form.tooLong', { max: field.maxLength });
    if (field.kind !== 'number') return '';
    const integer = field.step === 1;
    if (field.min !== undefined && field.max !== undefined)
      return t(integer ? 'settings.form.integerRange' : 'settings.form.numberRange', {
        min: field.min,
        max: field.max,
      });
    if (field.min !== undefined)
      return t(integer ? 'settings.form.integerMin' : 'settings.form.numberMin', { min: field.min });
    if (field.max !== undefined)
      return t(integer ? 'settings.form.integerMax' : 'settings.form.numberMax', { max: field.max });
    return t(integer ? 'settings.form.integer' : 'settings.form.number');
  };

  const control = (field: SchemaField, value: SettingValue | undefined, invalid: boolean) => {
    const shown = fieldDisplayValue(field, value);
    switch (field.kind) {
      case 'switch':
        return (
          <FormControl>
            <Switch checked={shown === true}
              onCheckedChange={(checked) => save(field, checked)} />
          </FormControl>
        );
      case 'select':
        return (
          <Select value={shown as string}
            onValueChange={(next) => save(field, next)}>
            <FormControl>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option}
                  value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'text':
      case 'number':
        return (
          <FormControl>
            <Input
              type={field.kind === 'number' ? 'number' : 'text'}
              className={field.kind === 'number' ? 'w-32 tabular-nums' : 'w-56'}
              value={drafts[field.key] ?? (shown as string)}
              maxLength={field.kind === 'text' ? field.maxLength : undefined}
              min={field.kind === 'number' ? field.min : undefined}
              max={field.kind === 'number' ? field.max : undefined}
              step={field.kind === 'number' ? field.step : undefined}
              aria-invalid={invalid || undefined}
              onChange={(e) => {
                setDraft(field.key, e.target.value);
                save(field, e.target.value);
              }}
              onBlur={() => setDraft(field.key, undefined)}
            />
          </FormControl>
        );
    }
  };

  return (
    <Form {...form}>
      <SettingsGroup title={view.installed.name}>
        {fields.map((field, index) => {
          const draft = drafts[field.key];
          const invalid = draft !== undefined && coerceFieldValue(field, draft) === undefined;
          return (
            <FormField
              key={field.key}
              control={form.control}
              name={`field${index}`}
              render={() => (
                <SettingsRow
                  label={field.title}
                  description={field.description}
                  control={control(field, values[field.key], invalid)}
                >
                  {invalid && (
                    <p role="status"
                      className="text-xs text-warning">
                      {invalidHint(field)}
                    </p>
                  )}
                </SettingsRow>
              )}
            />
          );
        })}
      </SettingsGroup>
    </Form>
  );
}
