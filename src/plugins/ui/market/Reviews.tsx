import React, { useState } from 'react';
import { MessageSquare, MessageSquareReply, Trash2 } from 'lucide-react';
import {
  Banner,
  Button,
  EmptyState,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SkeletonRows,
  Textarea,
} from '@pd2-trader/ui';
import { confirmToast, showToast } from '@/overlay';
import { useTranslation } from '@/i18n';
import type { InstalledPlugin } from '../../host/types';
import {
  REVIEW_SORTS,
  marketplaceApi,
  type ListingDetail,
  type Review,
  type ReviewInput,
  type ReviewSort,
  type ReviewSummary,
} from '../../marketplace/api';
import {
  REVIEW_BODY_MAX,
  histogramRows,
  reviewEligibility,
  reviewInput,
  validateReviewDraft,
  type ReviewDraftError,
} from '../../marketplace/reviews';
import { useMyReview, useReviews } from './data';
import { LoadError } from './LoadError';
import { RatingInput, RatingStars } from './parts';
import { ReportDialog } from './ReportDialog';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const formatDate = (iso: string) => {
  const at = Date.parse(iso);
  return Number.isNaN(at) ? '' : dateFormat.format(at);
};

/** Reviews tab of a listing: rating summary + histogram, the user's own review, and everyone's reviews. */
export function ReviewsSection({
  detail,
  installed,
  token,
}: {
  detail: ListingDetail;
  installed: Pick<InstalledPlugin, 'version' | 'source'> | undefined;
  token: string | null;
}) {
  const { t } = useTranslation('plugins');
  const [sort, setSort] = useState<ReviewSort>('recent');
  // Bumped after the user's own review changes: refetches the list, summary and "mine".
  const [version, setVersion] = useState(0);
  const reviews = useReviews(detail.id, sort, version);
  const mine = useMyReview(detail.id, token, version);
  const eligibility = reviewEligibility(!!token, installed, detail.versions);
  const changed = () => setVersion((v) => v + 1);

  return (
    <div className="flex flex-col gap-3">
      <RatingOverview
        summary={reviews.summary ?? { average: detail.rating.average, count: detail.rating.count, histogram: null }}
      />

      {eligibility.kind === 'ok' ? (
        mine.status === 'loading' ? (
          <SkeletonRows rows={2} />
        ) : mine.status === 'error' ? (
          <LoadError title={t('marketplace.reviews.mineFailed')}
            onRetry={mine.retry} />
        ) : (
          <ReviewForm
            key={`${mine.data.review?.id ?? 'new'}|${mine.data.review?.updatedAt ?? ''}`}
            existing={mine.data.review}
            installedVersion={eligibility.version}
            onSave={async (input) => {
              await marketplaceApi.saveReview(detail.id, token as string, input);
              changed();
            }}
            onDelete={async () => {
              await marketplaceApi.deleteReview(detail.id, token as string);
              changed();
            }}
          />
        )
      ) : (
        <p className="rounded-md border border-dashed border-border p-2.5 text-muted-foreground">
          {eligibility.kind === 'signedOut'
            ? t('marketplace.reviews.signIn')
            : eligibility.kind === 'notInstalled'
              ? t('marketplace.reviews.installFirst')
              : t('marketplace.reviews.unlisted', { version: eligibility.version })}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{t('marketplace.reviews.all')}</h3>
        <Select value={sort}
          onValueChange={(v) => setSort(v as ReviewSort)}>
          <SelectTrigger aria-label={t('marketplace.reviews.sortLabel')}
            className="h-7 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REVIEW_SORTS.map((s) => (
              <SelectItem key={s}
                value={s}
                className="text-xs">
                {t(`marketplace.reviews.sort.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reviews.status === 'error' ? (
        <LoadError title={t('marketplace.reviews.loadFailed')}
          onRetry={reviews.retry} />
      ) : reviews.status === 'loading' ? (
        <SkeletonRows rows={3} />
      ) : reviews.items.length === 0 ? (
        <EmptyState
          compact
          icon={<MessageSquare />}
          title={t('marketplace.reviews.empty')}
          description={t('marketplace.reviews.emptyHint')}
        />
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {reviews.items.map((review) => (
              <ReviewItem key={review.id}
                review={review}
                pluginId={detail.id}
                token={token} />
            ))}
          </ul>
          {reviews.more === 'error' && <LoadError onRetry={reviews.loadMore} />}
          {reviews.nextCursor && reviews.more !== 'error' && (
            <Button
              variant="outline"
              size="sm"
              className="self-center"
              disabled={reviews.more === 'loading'}
              onClick={reviews.loadMore}
            >
              {t('marketplace.loadMore')}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function RatingOverview({
  summary,
}: {
  summary: Omit<ReviewSummary, 'histogram'> & { histogram: ReviewSummary['histogram'] | null };
}) {
  const { t } = useTranslation('plugins');
  return (
    <div className="flex items-center gap-4 rounded-md border border-border bg-card/60 p-3">
      <div className="flex w-24 shrink-0 flex-col items-center gap-0.5">
        <span className="text-2xl font-semibold tabular-nums">
          {summary.average != null ? summary.average.toFixed(1) : '–'}
        </span>
        <RatingStars value={summary.average} />
        <span className="text-2xs tabular-nums text-muted-foreground">
          {t('marketplace.rating.count', { count: summary.count })}
        </span>
      </div>
      {summary.histogram && (
        <ul className="flex min-w-0 flex-1 flex-col gap-0.5"
          aria-label={t('marketplace.reviews.histogram')}>
          {histogramRows(summary.histogram).map((row) => (
            <li key={row.stars}
              className="flex items-center gap-2 text-2xs">
              <span className="w-3 shrink-0 text-right tabular-nums text-muted-foreground">{row.stars}</span>
              <Progress
                value={row.percent}
                aria-label={t('marketplace.reviews.histogramRow', { stars: row.stars, total: row.count })}
                className="h-1.5"
              />
              <span className="w-8 shrink-0 tabular-nums text-muted-foreground">{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewItem({ review, pluginId, token }: { review: Review; pluginId: string; token: string | null }) {
  const { t } = useTranslation('plugins');
  return (
    <li className="flex flex-col gap-1 px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <RatingStars value={review.rating} />
        <span className="truncate font-medium">{review.author}</span>
        <span className="text-2xs tabular-nums text-muted-foreground">
          {t('marketplace.reviews.meta', { version: review.version, date: formatDate(review.createdAt) })}
        </span>
        <span className="ml-auto">
          <ReportDialog
            compact
            token={token}
            target={{ kind: 'review', pluginId, reviewId: review.id, author: review.author }}
          />
        </span>
      </div>
      {review.body && <p className="whitespace-pre-line">{review.body}</p>}
      {review.reply && (
        <div className="mt-0.5 flex flex-col gap-0.5 border-l-2 border-border pl-2.5">
          <span className="flex items-center gap-1 text-2xs font-medium text-muted-foreground">
            <MessageSquareReply className="size-3"
              aria-hidden />
            {t('marketplace.reviews.reply', { date: formatDate(review.reply.at) })}
          </span>
          <p className="whitespace-pre-line text-muted-foreground">{review.reply.body}</p>
        </div>
      )}
    </li>
  );
}

/**
 * The signed-in user's review (create / edit / delete), always saved against the installed version: editing a
 * review written for an older version moves it to the installed one.
 */
export function ReviewForm({
  existing,
  installedVersion,
  onSave,
  onDelete,
}: {
  existing: Review | null;
  installedVersion: string;
  onSave: (input: ReviewInput) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { t } = useTranslation('plugins');
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [body, setBody] = useState(existing?.body ?? '');
  const [error, setError] = useState<ReviewDraftError | null>(null);
  const [busy, setBusy] = useState(false);
  const length = body.trim().length;

  const save = async () => {
    const problem = validateReviewDraft({ rating, body });
    setError(problem);
    if (problem) return;
    setBusy(true);
    try {
      await onSave(reviewInput({ rating, body }, installedVersion));
      showToast({ title: t('marketplace.reviews.saved'), variant: 'success' });
    } catch (e) {
      showToast({
        title: t('marketplace.reviews.saveFailed'),
        description: e instanceof Error ? e.message : String(e),
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };
  const remove = () =>
    confirmToast({
      title: t('marketplace.reviews.deleteTitle'),
      confirmLabel: t('marketplace.reviews.delete'),
      variant: 'warning',
      onConfirm: async () => {
        try {
          await onDelete();
        } catch (e) {
          showToast({
            title: t('marketplace.reviews.deleteFailed'),
            description: e instanceof Error ? e.message : String(e),
            variant: 'error',
          });
        }
      },
    });

  return (
    <form
      className="flex flex-col gap-2 rounded-md border border-border bg-card/60 p-2.5"
      aria-label={existing ? t('marketplace.reviews.editTitle') : t('marketplace.reviews.writeTitle')}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">
          {existing ? t('marketplace.reviews.editTitle') : t('marketplace.reviews.writeTitle')}
        </h3>
        <span className="text-2xs tabular-nums text-muted-foreground">
          {t('marketplace.reviews.forVersion', { version: installedVersion })}
        </span>
      </div>
      {existing && existing.version !== installedVersion && (
        <Banner tone="info"
          icon={<MessageSquare />}
          className="py-1.5 text-xs">
          {t('marketplace.reviews.olderVersion', { version: existing.version, installed: installedVersion })}
        </Banner>
      )}
      <RatingInput
        value={rating}
        onChange={(v) => {
          setRating(v);
          if (error === 'rating') setError(null);
        }}
        disabled={busy}
      />
      {error === 'rating' && (
        <span role="alert"
          className="text-2xs text-destructive">
          {t('marketplace.reviews.ratingRequired')}
        </span>
      )}
      <Label htmlFor="review-body"
        className="sr-only">
        {t('marketplace.reviews.bodyLabel')}
      </Label>
      <Textarea
        id="review-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t('marketplace.reviews.bodyPlaceholder')}
        aria-invalid={error === 'tooLong' || length > REVIEW_BODY_MAX || undefined}
        disabled={busy}
        className="min-h-20 text-xs"
      />
      <div className="flex items-center gap-2">
        <span
          className={
            length > REVIEW_BODY_MAX
              ? 'text-2xs tabular-nums text-destructive'
              : 'text-2xs tabular-nums text-muted-foreground'
          }
          role={error === 'tooLong' ? 'alert' : undefined}
        >
          {error === 'tooLong'
            ? t('marketplace.reviews.tooLong', { max: REVIEW_BODY_MAX })
            : t('marketplace.reviews.length', { length, max: REVIEW_BODY_MAX })}
        </span>
        <span className="ml-auto flex gap-1.5">
          {existing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={remove}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              {t('marketplace.reviews.delete')}
            </Button>
          )}
          <Button type="submit"
            size="sm"
            disabled={busy}>
            {existing ? t('marketplace.reviews.update') : t('marketplace.reviews.post')}
          </Button>
        </span>
      </div>
    </form>
  );
}
