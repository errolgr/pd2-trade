import React from 'react';
import { motion } from 'framer-motion';
import { SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { listItem, listStagger } from '@/lib/motion';
import { DEFAULT_VERDICT_RULE, type RareAppraisal, type RareHistory } from '@/lib/rare-appraisal-api';
import {
  MarketLine,
  RankBar,
  RankText,
  RareHistorySection,
  SectionLabel,
  StatList,
  VerdictBadge,
} from '@/components/rares/RareParts';
import { MODEL_SEASON, SLOT_LABELS } from '@/components/rares/rares-format';

/**
 * Price-check body for an appraised Rare: verdict + rank, percentile bar, market band, the item's stats
 * with key-stat stars, and the item's market history. "Search listings" switches to the regular
 * price-check search UI.
 */
export function RareAppraisalPanel({
  appraisal,
  history,
  onSearch,
}: {
  appraisal: RareAppraisal;
  history: RareHistory | null;
  onSearch: () => void;
}) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <motion.div variants={listStagger}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4 pr-3 pb-1">
        {/* Verdict */}
        <motion.section
          variants={listItem}
          className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
        >
          <div className="flex items-center gap-2.5">
            <VerdictBadge rare={appraisal}
              className="px-2.5 py-1 text-xs" />
            <RankText rare={appraisal}
              className="text-sm text-foreground" />
            <span className="ml-auto text-[11px] text-muted-foreground">
              {SLOT_LABELS[appraisal.slot]} · est. from {MODEL_SEASON} listings
            </span>
          </div>
          <RankBar rare={appraisal}
            rule={DEFAULT_VERDICT_RULE} />
          <MarketLine rare={appraisal} />
        </motion.section>

        {/* Stats */}
        <motion.section variants={listItem}
          className="flex flex-col gap-1">
          <div className="flex h-5 items-center px-2">
            <SectionLabel>Stats</SectionLabel>
          </div>
          <StatList rare={appraisal} />
        </motion.section>

        {/* History (hidden for weak fingerprints / never listed) */}
        <motion.div variants={listItem}>
          <RareHistorySection history={history} />
        </motion.div>

        <motion.div variants={listItem}>
          <Button variant="secondary"
            className="cursor-pointer"
            onClick={onSearch}>
            <SearchIcon />
            Search listings
          </Button>
        </motion.div>
      </motion.div>
    </ScrollArea>
  );
}
