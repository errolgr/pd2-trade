import React from 'react';
import { useForm } from 'react-hook-form';
import { Check, Copy, ExternalLink, Loader2, RotateCw, Send } from 'lucide-react';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useOptions } from '@/hooks/useOptions';
import { writeText } from '@/lib/browser-clipboard';
import { openUrl } from '@/lib/browser-opener';
import { type DiscordLinkCode, type DmStatus, getDmStatus, issueDiscordLinkCode, sendTestDm } from '@/lib/discord-dm';
import { SettingsGroup, SettingsRow } from '../settings-ui';

/**
 * Settings › Account › Discord: which Discord account is linked to this PD2 login, and a `/link` code to link one (typed
 * in the PD2 Trader Discord), and a test DM once linked. Hidden while signed out or when pd2trader.com has no Discord
 * yet. What the bot DMs about is under Settings › Discord.
 */
export function DiscordLinkSettings() {
  const { settings } = useOptions();
  const token = settings?.pd2Token ?? null;
  // SettingsRow's label and description read a form context; this row talks to the server directly
  const form = useForm();
  const [status, setStatus] = React.useState<DmStatus | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [code, setCode] = React.useState<DiscordLinkCode | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; text: string } | null>(null);

  const load = React.useCallback(async () => {
    if (!token) {
      setStatus(null);
      return;
    }
    setLoading(true);
    try {
      setStatus(await getDmStatus(token));
    } catch {
      // Older server (404) or signed out (401): the row stays hidden
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (!status?.enabled) return null;
  const linked = status.linked;

  const getCode = async () => {
    if (!token) return;
    setError(null);
    setCopied(false);
    try {
      setCode(await issueDiscordLinkCode(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get a link code');
    }
  };

  const test = async () => {
    if (!token) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await sendTestDm(token);
      setTestResult(
        result.sent
          ? { ok: true, text: 'Sent. Check your Discord DMs.' }
          : { ok: false, text: result.error ?? 'Not sent' },
      );
    } catch (err) {
      setTestResult({ ok: false, text: err instanceof Error ? err.message : 'Not sent' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Form {...form}>
      <SettingsGroup title="Discord">
        <SettingsRow
          settingKey="discordLink"
          label={linked ? `Linked to ${status.discordName ?? 'your Discord account'}` : 'Not linked'}
          description={
            linked
              ? 'The PD2 Trader bot DMs this Discord account (Settings › Discord). Link again to move it to another account.'
              : 'Link your Discord account to get DMs from the PD2 Trader bot about whispers, offers and watches.'
          }
          control={
            <>
              <Button type="button"
                size="sm"
                variant={linked ? 'outline' : 'default'}
                onClick={() => void getCode()}>
                {linked ? 'Relink' : 'Link Discord'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Refresh link status"
                disabled={loading}
                onClick={() => void load()}
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
              </Button>
            </>
          }
        >
          {code && (
            <div className="space-y-2 rounded-md border border-border/70 bg-muted/30 p-3 text-xs">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-2 py-1 font-mono text-sm">{code.command}</code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => void writeText(code.command).then(() => setCopied(true))}
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="text-muted-foreground">{code.instructions}</p>
              {code.inviteUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => void openUrl(code.inviteUrl!)}
                >
                  <ExternalLink className="size-3.5" /> Join the PD2 Trader Discord
                </Button>
              )}
            </div>
          )}
          {error && (
            <p role="alert"
              className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </SettingsRow>
        {linked && (
          <SettingsRow
            label="Test DM"
            description={
              testResult ? (
                <span className={testResult.ok ? 'text-success' : 'text-destructive'}>{testResult.text}</span>
              ) : (
                'Sends a DM now, so you can see it reaches you.'
              )
            }
            control={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={testing}
                onClick={() => void test()}
              >
                {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Send test DM
              </Button>
            }
          />
        )}
      </SettingsGroup>
    </Form>
  );
}
