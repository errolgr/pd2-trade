import { useOptions } from '@/hooks/useOptions';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { motion, MotionConfig } from 'framer-motion';
import { changeLog } from '@/assets/changeLog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { listItem, listStagger } from '@/lib/motion';
import { cn } from '@/lib/utils';

type EntryType = 'feature' | 'fix' | 'other';

function entryType(emoji: string | undefined): EntryType {
  if (emoji === '🔧') return 'fix';
  if (emoji === '🆕' || emoji === '✨') return 'feature';
  return 'other';
}

function parseEntry(entry: string) {
  const match = entry.match(/^(🆕|✨|🔧|💎|🐛|🔄|📊|⬇️)/);
  return {
    emoji: match?.[1] || '',
    text: match ? entry.slice(match[0].length).trim() : entry,
    type: entryType(match?.[1]),
  };
}

function entryBorderColor(type: EntryType) {
  switch (type) {
    case 'feature':
      return 'border-success';
    case 'fix':
      return 'border-warning';
    default:
      return 'border-border';
  }
}

/** Only the first few sections stagger in; the rest render immediately (they start off-screen). */
const STAGGERED_SECTIONS = 6;

function VersionSection({
  version,
  entries,
  isCurrent,
  stagger,
}: {
  version: string;
  entries: string[];
  isCurrent: boolean;
  stagger: boolean;
}) {
  return (
    <motion.section
      variants={stagger ? listItem : undefined}
      className={cn(
        'relative rounded-lg',
        isCurrent ? 'border border-primary/30 bg-primary/5 p-4 shadow-xs' : 'px-1 py-3',
      )}
    >
      {isCurrent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
        />
      )}
      <div className="mb-3 flex items-center gap-2">
        <Badge variant={isCurrent ? 'default' : 'secondary'}
          className="font-mono text-xs">
          v{version}
        </Badge>
        {isCurrent && (
          <Badge variant="outline"
            className="gap-1 border-primary/50 text-xs text-primary">
            <Sparkles />
            Current
          </Badge>
        )}
        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
          {entries.length} change{entries.length === 1 ? '' : 's'}
        </span>
      </div>
      <ul className="space-y-1.5">
        {entries.map((entry, idx) => {
          const parsed = parseEntry(entry);
          return (
            <li
              key={idx}
              className={cn(
                'rounded-r-md border-l-2 py-1.5 pr-2 pl-3 text-sm leading-relaxed transition-colors duration-(--dur-fast) ease-out hover:bg-accent/40',
                entryBorderColor(parsed.type),
                isCurrent ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {parsed.emoji && <span className="mr-1.5">{parsed.emoji}</span>}
              {parsed.text}
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

function ChangelogSkeleton() {
  return (
    <div aria-hidden
      className="space-y-3 p-4">
      <Skeleton className="h-5 w-24" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i}
          className="h-9 w-full" />
      ))}
    </div>
  );
}

export default function ChangelogPage() {
  const { settings, updateSettings } = useOptions();
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then((version) => {
      setCurrentVersion(version);
      if (version && settings.lastSeenVersion !== version) {
        updateSettings({ lastSeenVersion: version });
      }
    });
  }, []);

  const allVersions = Object.keys(changeLog) as Array<keyof typeof changeLog>;

  return (
    <MotionConfig reducedMotion="user">
      <WindowPanel animate
        className="h-screen w-screen">
        <WindowChrome
          title="What's New"
          icon={<Sparkles className="text-primary" />}
          onClose={() => getCurrentWebviewWindow().hide()}
          closeLabel="Close changelog"
          className="h-12 px-3"
          titleClassName="text-base font-bold"
        />

        {currentVersion ? (
          <ScrollArea className="min-h-0 flex-1">
            <motion.div className="space-y-1 p-4"
              variants={listStagger}
              initial="hidden"
              animate="visible">
              {allVersions.map((version, idx) => (
                <React.Fragment key={version}>
                  <VersionSection version={version}
                    entries={changeLog[version]}
                    isCurrent={version === currentVersion}
                    stagger={idx < STAGGERED_SECTIONS} />
                  {idx < allVersions.length - 1 && !(version === currentVersion) && (
                    <div aria-hidden
                      className="mx-1 my-2 h-px bg-border/70" />
                  )}
                </React.Fragment>
              ))}
            </motion.div>
          </ScrollArea>
        ) : (
          <ChangelogSkeleton />
        )}
      </WindowPanel>
    </MotionConfig>
  );
}
