import moment from 'moment';
import { cn } from '@/lib/utils';
import { Tip } from '@/components/ui/tooltip';
import type { ScoredListing } from '../lib/types';
import { useTranslation } from '@/i18n';

/**
 * How an archive listing ended ("Sold", "Removed", "Expired"; the tooltip says what that means and when). Nothing
 * while it's active or when the service didn't say.
 */
export function EndedTag({ row, className }: { row: Pick<ScoredListing, 'status' | 'endedAt'>; className?: string }) {
  const { t } = useTranslation('market');
  const { status, endedAt } = row;
  if (!status || status === 'active') return null;
  const meaning = t(`filters.status.${status}Title`);
  return (
    <Tip label={endedAt ? `${meaning} · ${moment(endedAt).fromNow()}` : meaning}>
      <span className={cn('font-medium', status === 'sold' ? 'text-success' : 'text-muted-foreground', className)}>
        {t(`filters.status.${status}`)}
      </span>
    </Tip>
  );
}
