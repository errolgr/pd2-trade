import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useOptions } from '@/hooks/useOptions';
import imgPath from '../../../../assets/img.png';
import { getVersion } from '@/lib/browser-app';
import { useUpdater } from '@/hooks/useUpdater';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { isTauri } from '@tauri-apps/api/core';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpCircle, CheckCircle2, Download, FileText, Loader2, RefreshCw } from 'lucide-react';
import { fadeInUp, springSoft } from '@/lib/motion';
import { showToast, useOverlay } from '@/overlay';
import { manualUpdateToast, markManualUpdateRequired, requiresManualUpdate } from '@/lib/manual-update';
import { isNetworkError } from '@/lib/network-errors';
import { SettingsGroup, SettingsRow, SettingsSkeleton } from '../settings-ui';

export function AboutForm() {
  const { settings, isLoading } = useOptions();
  const [version, setVersion] = React.useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const { checkForUpdates, downloadUpdate } = useUpdater();
  const { openPanel } = useOverlay();

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  // Show a loading indicator until settings have loaded.
  if (isLoading || !settings) {
    return <SettingsSkeleton rows={2} />;
  }

  const handleCheckForUpdates = async () => {
    if (!isTauri()) return;

    setIsChecking(true);
    try {
      const update = await checkForUpdates();
      setUpdateInfo(update);
      setLastChecked(new Date());
    } catch (error) {
      // Offline / GitHub unreachable: the user's network, not an app bug
      if (isNetworkError(error)) console.warn('Failed to check for updates:', error);
      else console.error('Failed to check for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdateNow = async () => {
    if (!updateInfo?.available) return;
    try {
      await downloadUpdate(updateInfo);
    } catch (error) {
      if (isNetworkError(error)) {
        console.warn('Could not download update:', error);
        showToast({
          title: 'PD2 Trader',
          description: 'Failed to download update. Please try again later.',
          variant: 'error',
        });
        return;
      }
      if (!requiresManualUpdate(error)) throw error;
      // Linux deb/rpm installs can't update in place: point at the release page instead of reporting it
      console.warn('Update must be installed manually:', error);
      markManualUpdateRequired();
      showToast(manualUpdateToast(updateInfo.version));
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
  };

  const openChangelog = () => openPanel('changeLog');

  return (
    <div className="flex flex-col gap-y-6">
      <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-lg border border-border/70 bg-card/50 px-6 py-8 text-center shadow-xs">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-72 rounded-full bg-primary/15 blur-3xl"
        />
        <motion.img
          src={imgPath}
          alt="PD2 Trader logo"
          width={56}
          height={56}
          className="relative drop-shadow-lg"
          initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={springSoft}
        />
        <div className="relative flex flex-col items-center gap-1.5">
          <span className="text-2xl font-bold text-foreground"
            style={{ fontFamily: 'DiabloFont' }}>
            PD2 Trader
          </span>
          {version ? (
            <span className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
              Version: {version}
            </span>
          ) : (
            <Skeleton className="h-5 w-28 rounded-full" />
          )}
        </div>
        <div className="relative mt-2 flex w-full max-w-xs flex-col gap-2">
          {isTauri() && (
            <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/50 p-4">
              <AnimatePresence mode="wait"
                initial={false}>
                {updateInfo?.available ? (
                  <motion.div
                    key="available"
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-center gap-2 font-medium text-success">
                      <ArrowUpCircle className="size-4" />
                      Update Available (v{updateInfo.version})
                    </div>
                    <Button onClick={handleUpdateNow}
                      className="w-full"
                      variant="default">
                      <Download />
                      Update Now (v{updateInfo.version})
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="latest"
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex items-center justify-center gap-2 font-medium text-foreground"
                  >
                    <CheckCircle2 className="size-4 text-success" />
                    You have the latest version
                  </motion.div>
                )}
              </AnimatePresence>

              {lastChecked && (
                <div className="text-center text-xs text-muted-foreground">
                  Last checked: {formatTimeAgo(lastChecked)}
                </div>
              )}

              <Button
                onClick={handleCheckForUpdates}
                disabled={isChecking}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Check for Updates
                  </>
                )}
              </Button>
            </div>
          )}

          <Button variant="outline"
            size="sm"
            onClick={openChangelog}
            className="w-full">
            <FileText className="h-4 w-4" />
            View Changelog
          </Button>
        </div>
      </div>

      {isTauri() && <UpdateSettingsForm />}

      <div className="grid grid-cols-2 gap-3">
        <CreditTile role="Developer"
          names={['@Doreet']} />
        <CreditTile role="Contributors"
          names={['@pandamancer']} />
      </div>
    </div>
  );
}

function UpdateSettingsForm() {
  const { settings, updateSettings } = useOptions();
  const form = useForm<{ autoUpdateEnabled: boolean }>({
    defaultValues: { autoUpdateEnabled: settings.autoUpdateEnabled ?? true },
  });

  // Reset form when settings change externally
  React.useEffect(() => {
    form.reset({ autoUpdateEnabled: settings.autoUpdateEnabled ?? true }, { keepDirty: false });
  }, [settings.autoUpdateEnabled, form]);

  return (
    <Form {...form}>
      <SettingsGroup title="Updates">
        <FormField
          control={form.control}
          name="autoUpdateEnabled"
          render={({ field }) => (
            <SettingsRow
              label="Automatic Updates"
              description="Download and install new versions on startup, then restart. When off, you still get a notification when an update is available."
              control={
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      updateSettings({ autoUpdateEnabled: checked });
                    }}
                  />
                </FormControl>
              }
            />
          )}
        />
      </SettingsGroup>
    </Form>
  );
}

function CreditTile({ role, names }: { role: string; names: string[] }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border/70 bg-card/50 px-4 py-3 text-center shadow-xs">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{role}</span>
      {names.map((name) => (
        <span key={name}
          className="text-sm font-medium text-foreground">
          {name}
        </span>
      ))}
    </div>
  );
}
