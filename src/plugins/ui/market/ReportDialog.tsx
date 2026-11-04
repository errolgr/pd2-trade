import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
  RadioGroup,
  RadioGroupItem,
  Textarea,
} from '@pd2-trader/ui';
import { showToast } from '@/overlay';
import { useTranslation } from '@/i18n';
import { MarketplaceHttpError, REPORT_REASONS, marketplaceApi, type ReportReason } from '../../marketplace/api';
import { REPORT_DETAILS_MAX } from '../../marketplace/reviews';

export type ReportTarget =
  | { kind: 'plugin'; pluginId: string; name: string }
  | { kind: 'review'; pluginId: string; reviewId: string; author: string };

/**
 * Report a plugin or a review to the moderators: one reason from the fixed list plus optional details. Needs a
 * PD2 sign-in (the trigger is disabled without one).
 */
export function ReportDialog({
  target,
  token,
  compact,
}: {
  target: ReportTarget;
  token: string | null;
  compact?: boolean;
}) {
  const { t } = useTranslation('plugins');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const label = target.kind === 'plugin' ? t('marketplace.report.plugin') : t('marketplace.report.review');
  const tooLong = details.trim().length > REPORT_DETAILS_MAX;

  const submit = async () => {
    if (!token || !reason || tooLong) return;
    setSending(true);
    const input = { reason, details: details.trim() || undefined };
    try {
      if (target.kind === 'plugin') await marketplaceApi.reportPlugin(target.pluginId, token, input);
      else await marketplaceApi.reportReview(target.pluginId, target.reviewId, token, input);
      showToast({
        title: t('marketplace.report.sent'),
        description: t('marketplace.report.sentHint'),
        variant: 'success',
      });
      setOpen(false);
      setReason('');
      setDetails('');
    } catch (error) {
      if (error instanceof MarketplaceHttpError && error.status === 409) {
        showToast({ title: t('marketplace.report.already'), variant: 'info' });
        setOpen(false);
      } else
        showToast({
          title: t('marketplace.report.failed'),
          description: error instanceof Error ? error.message : String(error),
          variant: 'error',
        });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open}
      onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'icon-xs' : 'sm'}
          disabled={!token}
          aria-label={compact ? label : undefined}
          title={token ? label : t('marketplace.report.signIn')}
          className="text-muted-foreground"
        >
          <Flag className={compact ? 'size-3' : 'size-3.5'} />
          {!compact && label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-contained gap-3 p-4 text-xs sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {target.kind === 'plugin'
              ? t('marketplace.report.pluginTitle', { name: target.name })
              : t('marketplace.report.reviewTitle', { author: target.author })}
          </DialogTitle>
          <DialogDescription className="text-xs">{t('marketplace.report.intro')}</DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={reason}
          onValueChange={(v) => setReason(v as ReportReason)}
          aria-label={t('marketplace.report.reason')}
          className="gap-1.5"
        >
          {REPORT_REASONS.map((r) => (
            <Label
              key={r}
              className="flex items-start gap-2 rounded-md border border-border p-2 font-normal hover:bg-accent"
            >
              <RadioGroupItem value={r}
                className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <span className="text-xs font-medium">{t(`marketplace.report.reasons.${r}.label`)}</span>
                <span className="text-2xs text-muted-foreground">{t(`marketplace.report.reasons.${r}.hint`)}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
        <div className="flex flex-col gap-1">
          <Label htmlFor="report-details"
            className="text-xs">
            {t('marketplace.report.details')}
          </Label>
          <Textarea
            id="report-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t('marketplace.report.detailsPlaceholder')}
            aria-invalid={tooLong || undefined}
            className="min-h-16 text-xs"
          />
          {tooLong && (
            <span className="text-2xs text-destructive">
              {t('marketplace.reviews.tooLong', { max: REPORT_DETAILS_MAX })}
            </span>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}>
            {t('consent.cancel')}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!reason || tooLong || sending}
            onClick={() => void submit()}
          >
            {sending ? t('marketplace.report.sending') : t('marketplace.report.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
