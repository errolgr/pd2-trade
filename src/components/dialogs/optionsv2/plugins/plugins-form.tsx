import React from 'react';
import { useForm } from 'react-hook-form';
import { isTauri } from '@tauri-apps/api/core';
import { AlertTriangle, FolderOpen, Puzzle, Store } from 'lucide-react';
import {
  Button,
  Form,
  FormControl,
  FormField,
  Input,
  Banner,
  EmptyState,
  SettingsGroup,
  SettingsRow,
  SettingsSkeleton,
} from '@pd2-trader/ui';
import { showToast, useOverlay } from '@/overlay';
import { devLoader } from '@/plugins/dev/unpacked';
import { pluginHost, type PluginView } from '@/plugins/host/manager';
import type { PluginSource } from '@/plugins/host/types';
import { usePluginHost } from '@/plugins/ui/hooks';
import {
  PluginEnableSwitch,
  PluginSourceBadge,
  PluginStatusBadge,
  PluginStatusText,
  ReviewUpdateButton,
  UninstallPluginButton,
} from '@/plugins/ui/PluginManageControls';
import { useTranslation } from '@/i18n';
import { hasSettingsSection, PluginSettingsForm } from './plugin-settings-form';

/** Settings → Plugins: installed plugins, Load unpacked, and each plugin's schema-rendered settings (B5). */
export function PluginsForm() {
  const { t } = useTranslation('plugins');
  const host = usePluginHost();
  const { openPanel } = useOverlay();
  // Only gives the rows their FormItem wiring: plugin state lives in the plugin host.
  const form = useForm<Record<string, string>>();

  if (!host.ready) return <SettingsSkeleton rows={2} />;

  const browse = (
    <Button type="button"
      variant="outline"
      size="sm"
      onClick={() => openPanel('plugins', { tab: 'browse' })}>
      <Store className="size-4" />
      {t('settings.browse')}
    </Button>
  );
  const withSettings = host.plugins.filter(hasSettingsSection);

  return (
    <div className="flex flex-col gap-y-6">
      <Form {...form}>
        {host.plugins.length === 0 ? (
          <EmptyState
            icon={<Puzzle className="size-5" />}
            title={t('settings.empty.title')}
            description={t('settings.empty.description')}
            action={browse}
          />
        ) : (
          <SettingsGroup title={t('settings.installed.group')}
            aside={browse}>
            {host.plugins.map((view, index) => (
              <FormField
                key={view.installed.id}
                control={form.control}
                name={`plugin${index}`}
                render={() => <InstalledPluginRow view={view} />}
              />
            ))}
          </SettingsGroup>
        )}
        <SettingsGroup title={t('settings.unpacked.group')}>
          <FormField control={form.control}
            name="unpacked"
            render={() => <LoadUnpackedRow />} />
        </SettingsGroup>
      </Form>
      {withSettings.map((view) => (
        <PluginSettingsForm key={view.installed.id}
          view={view} />
      ))}
    </div>
  );
}

function InstalledPluginRow({ view }: { view: PluginView }) {
  const { t } = useTranslation('plugins');
  const { installed } = view;
  return (
    <SettingsRow
      label={
        <span className="flex flex-wrap items-center gap-2">
          {installed.name}
          <span className="text-xs font-normal tabular-nums text-muted-foreground">
            {t('settings.installed.version', { version: installed.version })}
          </span>
          <PluginSourceBadge view={view} />
          <PluginStatusBadge view={view} />
        </span>
      }
      description={view.manifest?.description}
      control={
        <>
          <ReviewUpdateButton view={view} />
          <FormControl>
            <PluginEnableSwitch view={view} />
          </FormControl>
          <UninstallPluginButton view={view} />
        </>
      }
    >
      <PluginStatusText view={view} />
    </SettingsRow>
  );
}

/**
 * Load unpacked (C2.2): a dev server URL in browser mode, a folder inside the app config folder in the desktop
 * app. Installing opens the consent sheet; the host hot-reloads the plugin when its files change.
 */
function LoadUnpackedRow() {
  const { t } = useTranslation('plugins');
  const transport: 'url' | 'folder' = isTauri() ? 'folder' : 'url';
  const [location, setLocation] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    const trimmed = location.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    const source: PluginSource = { kind: 'dev', location: trimmed, transport };
    try {
      const bundle = await devLoader.load(source);
      if (await pluginHost.install(bundle, source)) {
        setLocation('');
        showToast({ title: t('settings.unpacked.installed', { name: bundle.manifest.name }), variant: 'success' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsRow
      layout="stacked"
      label={t('settings.unpacked.label')}
      description={transport === 'url' ? t('settings.unpacked.urlHint') : t('settings.unpacked.folderHint')}
      control={
        <form
          className="flex w-full items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <FormControl>
            <Input
              className="flex-1 font-mono text-xs"
              value={location}
              placeholder={transport === 'url' ? 'http://localhost:5199/' : 'plugins-dev/my-plugin'}
              spellCheck={false}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormControl>
          <Button type="submit"
            variant="secondary"
            size="sm"
            disabled={busy || !location.trim()}>
            <FolderOpen className="size-4" />
            {busy ? t('settings.unpacked.loading') : t('settings.unpacked.load')}
          </Button>
        </form>
      }
    >
      {error && (
        <Banner tone="destructive"
          role="alert"
          icon={<AlertTriangle />}>
          <span className="font-medium">{t('settings.unpacked.failed')}</span>{' '}
          <span className="text-muted-foreground">{error}</span>
        </Banner>
      )}
    </SettingsRow>
  );
}
