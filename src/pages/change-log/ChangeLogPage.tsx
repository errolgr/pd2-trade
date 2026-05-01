import { useOptions } from '@/hooks/useOptions';
import { Button } from '@/components/ui/button';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { X, GripVertical } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { changeLog } from '@/assets/changeLog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

function parseEntry(entry: string) {
  const match = entry.match(/^(🆕|✨|🔧|💎|🐛|🔄|📊|⬇️)/);
  return {
    emoji: match?.[1] || '',
    text: match ? entry.slice(match[0].length).trim() : entry,
    type: match?.[1] === '🔧' ? 'fix' : match?.[1] === '🆕' || match?.[1] === '✨' ? 'feature' : 'other',
  };
}

function entryBorderColor(type: string) {
  switch (type) {
    case 'feature':
      return 'border-l-2 border-green-500';
    case 'fix':
      return 'border-l-2 border-yellow-500';
    default:
      return 'border-l-2 border-neutral-600';
  }
}

function VersionSection({ version, entries, isCurrent }: { version: string; entries: string[]; isCurrent: boolean }) {
  return (
    <div className={isCurrent ? 'rounded-lg border border-blue-500/30 bg-blue-500/5 p-4' : 'py-3'}>
      <div className="flex items-center gap-2 mb-3">
        <Badge variant={isCurrent ? 'default' : 'secondary'}
          className="text-xs">
          v{version}
        </Badge>
        {isCurrent && (
          <Badge variant="outline"
            className="text-xs border-blue-500/50 text-blue-400">
            Current
          </Badge>
        )}
      </div>
      <div className="space-y-1.5">
        {entries.map((entry, idx) => {
          const parsed = parseEntry(entry);
          return (
            <div
              key={idx}
              className={`pl-3 py-1.5 text-sm ${entryBorderColor(parsed.type)} ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              {parsed.emoji && <span className="mr-1.5">{parsed.emoji}</span>}
              {parsed.text}
            </div>
          );
        })}
      </div>
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

  if (!currentVersion) return null;

  const allVersions = Object.keys(changeLog) as Array<keyof typeof changeLog>;

  return (
    <Card className="w-screen h-screen flex flex-col overflow-hidden">
      <div className="flex flex-col h-full min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <GripVertical
              data-tauri-drag-region
              className="h-4 w-4 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            />
            <h1 className="text-lg font-bold">What&apos;s New</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => getCurrentWebviewWindow().hide()}
            className="cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-1">
            {allVersions.map((version, idx) => (
              <React.Fragment key={version}>
                <VersionSection version={version}
                  entries={changeLog[version]}
                  isCurrent={version === currentVersion} />
                {idx < allVersions.length - 1 && !(version === currentVersion) && <Separator className="my-2" />}
              </React.Fragment>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
