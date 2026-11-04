import React from 'react';
import { ChevronRight, Clock, LogIn, Star, StarOff, Trash2, UserRound, X } from 'lucide-react';
import { cn, Button, CharacterCard, PriceTag, Skeleton, EmptyState } from '@pd2-trader/ui';
import { useOptions, type BuildCharacterRef } from '@/hooks/useOptions';
import { useSignIn } from '@/hooks/useSignIn';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { type AccountCharacter, type BuildsMode, BUILDS_MIN_LEVEL, getAccountCharacters } from '@/lib/builds-api';
import { useBuildsActions } from '../lib/context';
import { useBuildCharacter, useBuildsQuery } from '../lib/useBuildsQuery';
import { signatureSkills } from '../lib/gear-up';
import { classPortraitUrl, timeAgo } from '../lib/format';
import { currentLocale, useTranslation } from '@/i18n';
import { QueryError, Segmented, SkillIcon } from './parts';

export type CharactersView = 'mine' | 'following' | 'recent';

export function CharactersTab({ view, onView }: { view: CharactersView; onView: (view: CharactersView) => void }) {
  const { t } = useTranslation(['builds', 'common']);
  const { settings, updateSettings } = useOptions();
  const followed = settings?.followedBuildCharacters ?? [];
  const recent = settings?.recentBuildCharacters ?? [];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border/60 px-3">
        <Segmented
          label={t('page.tabs.characters')}
          layoutId="builds-characters-view"
          value={view}
          onChange={onView}
          options={[
            { value: 'mine', label: t('characters.mine') },
            {
              value: 'following',
              label: (
                <>
                  {t('characters.following')}
                  {followed.length > 0 && <Count n={followed.length} />}
                </>
              ),
            },
            {
              value: 'recent',
              label: (
                <>
                  {t('characters.recent')}
                  {recent.length > 0 && <Count n={recent.length} />}
                </>
              ),
            },
          ]}
        />
        {view === 'recent' && recent.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1.5 text-xs text-muted-foreground"
            onClick={() => updateSettings({ recentBuildCharacters: [] })}
          >
            <Trash2 className="size-3.5" /> {t('common:actions.clear')}
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {view === 'mine' && <MineView />}
        {view === 'following' &&
          (followed.length === 0 ? (
            <EmptyState
              className="m-6"
              icon={<Star />}
              title={t('characters.followingEmptyTitle')}
              description={t('characters.followingEmptyDescription')}
            />
          ) : (
            <CharacterRows>
              {followed.map((ref) => (
                <TrackedCard
                  key={`${ref.mode}:${ref.name}`}
                  charRef={ref}
                  onRemove={() =>
                    updateSettings({
                      followedBuildCharacters: followed.filter((r) => !(r.name === ref.name && r.mode === ref.mode)),
                    })
                  }
                  removeLabel={t('characters.unfollow')}
                  unfollow
                />
              ))}
            </CharacterRows>
          ))}
        {view === 'recent' &&
          (recent.length === 0 ? (
            <EmptyState
              className="m-6"
              icon={<Clock />}
              title={t('characters.recentEmptyTitle')}
              description={t('characters.recentEmptyDescription')}
            />
          ) : (
            <CharacterRows>
              {recent.map((ref) => (
                <TrackedCard key={`${ref.mode}:${ref.name}`}
                  charRef={ref} />
              ))}
            </CharacterRows>
          ))}
      </div>
    </div>
  );
}

const Count = ({ n }: { n: number }) => <span className="text-3xs text-muted-foreground tabular-nums">{n}</span>;

function CharacterRows({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-border/40">{children}</div>;
}

// ───────────────────────────── Mine ─────────────────────────────

function MineView() {
  const { t } = useTranslation(['builds', 'common']);
  const { settings } = useOptions();
  const { openSignIn } = useSignIn();
  const { authData } = usePd2Website();
  if (!settings?.pd2Token) {
    return (
      <EmptyState
        className="m-6"
        icon={<LogIn />}
        title={t('characters.signInTitle')}
        description={t('characters.signInDescription')}
        action={
          <Button size="sm"
            onClick={openSignIn}>
            {t('common:actions.signIn')}
          </Button>
        }
      />
    );
  }
  if (!authData) {
    return (
      <div aria-busy
        className="space-y-2 p-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  const accounts = authData.user?.game?.accounts ?? [];
  if (accounts.length === 0) {
    return (
      <EmptyState
        className="m-6"
        icon={<UserRound />}
        title={t('characters.noAccountTitle')}
        description={t('characters.noAccountDescription')}
      />
    );
  }
  return (
    <div className="divide-y divide-border/50">
      {accounts.map((account) => (
        <AccountSection key={account}
          account={account} />
      ))}
    </div>
  );
}

function AccountSection({ account }: { account: string }) {
  const { t } = useTranslation('builds');
  const { mode } = useBuildsActions();
  const query = useBuildsQuery(`account|${account.toLowerCase()}`, (signal) => getAccountCharacters(account, signal));
  const characters = query.data ?? [];
  const isPrimary = (c: AccountCharacter) => c.ladder && c.hardcore === (mode === 'hardcore');
  const byLevel = (a: AccountCharacter, b: AccountCharacter) => b.level - a.level || a.name.localeCompare(b.name);
  const primary = characters.filter(isPrimary).sort(byLevel);
  const others = characters.filter((c) => !isPrimary(c)).sort(byLevel);

  return (
    <section aria-label={t('characters.accountLabel', { account })}>
      <h3 className="flex h-8 items-center gap-2 border-b border-border/50 bg-muted/20 px-3 text-xs font-semibold text-foreground">
        <UserRound className="size-3.5 text-muted-foreground" />
        {account}
        {query.data && (
          <span className="font-normal text-muted-foreground">
            {t('characters.count', {
              count: characters.length,
              formatted: characters.length.toLocaleString(currentLocale()),
            })}
          </span>
        )}
      </h3>
      {query.error ? (
        <QueryError query={query}
          className="m-2"
          compact
          title={t('characters.loadAccountError', { account })} />
      ) : query.loading && !query.data ? (
        <CharacterRows>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i}
              className="mx-3 my-2 h-9" />
          ))}
        </CharacterRows>
      ) : query.data === null ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">{t('characters.unknownAccount')}</p>
      ) : characters.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">{t('characters.noCharacters')}</p>
      ) : (
        <>
          {primary.length > 0 ? (
            <CharacterRows>
              {primary.map((c) => (
                <MyCharacterCard key={c.name}
                  character={c} />
              ))}
            </CharacterRows>
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">{t('characters.noLadderCharacters', { mode })}</p>
          )}
          {others.length > 0 && (
            <>
              <p className="border-t border-border/50 px-3 pt-2 pb-1 text-3xs tracking-wide text-muted-foreground uppercase">
                {t('characters.otherModes')}
              </p>
              <CharacterRows>
                {others.map((c) => (
                  <MyCharacterCard key={c.name}
                    character={c}
                    secondary />
                ))}
              </CharacterRows>
            </>
          )}
        </>
      )}
    </section>
  );
}

function MyCharacterCard({ character: c, secondary = false }: { character: AccountCharacter; secondary?: boolean }) {
  const { t } = useTranslation('builds');
  const charMode: BuildsMode = c.hardcore ? 'hardcore' : 'softcore';
  const tracked = c.ladder && c.level >= BUILDS_MIN_LEVEL;
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2', secondary && 'opacity-60 hover:opacity-100')}>
      <CharacterCard
        name={c.name}
        cls={c.className}
        level={c.level}
        ladder={c.ladder}
        hardcore={c.hardcore || undefined}
        portraitSrc={classPortraitUrl(c.className)}
        className="w-95 shrink-0 p-0"
      />
      <div className="min-w-0 flex-1">
        {tracked ? (
          <TrackedSummary name={c.name}
            mode={charMode} />
        ) : !c.ladder ? (
          <p className="text-2xs text-muted-foreground">{t('characters.onlyLadder')}</p>
        ) : (
          <BelowMinLevel className={c.className} />
        )}
      </div>
    </div>
  );
}

function BelowMinLevel({ className }: { className: string }) {
  const { t } = useTranslation('builds');
  const { showClassMeta } = useBuildsActions();
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-2xs text-muted-foreground">{t('characters.trackedFrom', { level: BUILDS_MIN_LEVEL })}</span>
      <Button variant="outline"
        size="sm"
        className="h-6 px-2 text-2xs"
        onClick={() => showClassMeta(className)}>
        {t('characters.seeClassBuilds', { level: BUILDS_MIN_LEVEL, className })}
      </Button>
    </div>
  );
}

/** A tracked character's build in one line (top skills, gear value); click opens it. */
function TrackedSummary({ name, mode }: { name: string; mode: BuildsMode }) {
  const { t } = useTranslation('builds');
  const { openCharacter } = useBuildsActions();
  const query = useBuildCharacter(name, mode);
  if (query.status === 404) {
    return <p className="text-2xs text-muted-foreground">{t('characters.notCrawled')}</p>;
  }
  if (query.error) return <QueryError query={query}
    compact
    title={t('characters.loadBuildError')} />;
  const detail = query.data && !query.stale ? query.data : null;
  if (!detail) return <Skeleton className="h-6 w-full" />;
  return (
    <Button
      type="button"
      variant="ghost"
      size="inline"
      onClick={() => openCharacter(detail.name, detail.mode)}
      className="group flex w-full justify-start gap-1.5 rounded-md text-left font-normal hover:bg-transparent hover:text-current focus-visible:ring-ring/50"
    >
      {signatureSkills(detail.skills, 3).map((s) => (
        <SkillIcon key={s.name}
          name={s.name}
          size={20} />
      ))}
      <span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">
        {signatureSkills(detail.skills, 1)[0]?.name ?? t('characters.build')} · {timeAgo(detail.lastUpdated)}
      </span>
      {detail.gearValueHr != null && (
        <PriceTag amount={detail.gearValueHr}
          unit="hr"
          className="shrink-0 text-2xs font-medium text-q-gold" />
      )}
      <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Button>
  );
}

// ───────────────────────────── Following / Recent ─────────────────────────────

function TrackedCard({
  charRef,
  onRemove,
  removeLabel,
  unfollow = false,
}: {
  charRef: BuildCharacterRef;
  onRemove?: () => void;
  removeLabel?: string;
  unfollow?: boolean;
}) {
  const { t } = useTranslation('builds');
  const { openCharacter } = useBuildsActions();
  const query = useBuildCharacter(charRef.name, charRef.mode);
  const detail = query.data && !query.stale ? query.data : null;
  return (
    <div className="group relative transition-colors hover:bg-accent/30">
      {detail ? (
        <CharacterCard
          name={charRef.name}
          cls={detail.className}
          level={detail.level}
          hardcore={charRef.mode === 'hardcore' || undefined}
          dead={detail.isDead && charRef.mode === 'hardcore'}
          portraitSrc={classPortraitUrl(detail.className)}
          value={detail.gearValueHr != null ? { amount: detail.gearValueHr, unit: 'hr' } : undefined}
          onClick={() => openCharacter(charRef.name, charRef.mode)}
          className={cn(
            'rounded-none px-3 py-2 hover:bg-transparent focus-visible:bg-accent/40 focus-visible:ring-0',
            onRemove && 'pr-10',
          )}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="inline"
          onClick={() => openCharacter(charRef.name, charRef.mode)}
          className="flex w-full justify-start gap-2.5 rounded-none px-3 py-2 text-left font-normal whitespace-normal hover:bg-transparent hover:text-current focus-visible:bg-accent/40 focus-visible:ring-0"
        >
          <Skeleton className="h-7.5 w-8.5" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-foreground">{charRef.name}</div>
            <div className="text-2xs text-muted-foreground">
              {query.status === 404 ? (
                t('characters.notInMode', { mode: charRef.mode })
              ) : query.error ? (
                t('characters.couldntLoad')
              ) : (
                <Skeleton className="mt-1 h-2.5 w-24" />
              )}
            </div>
          </div>
        </Button>
      )}
      {onRemove && (
        <Button
          type="button"
          variant="quiet"
          size="icon-xs"
          aria-label={t('characters.removeLabel', { action: removeLabel, name: charRef.name })}
          title={removeLabel}
          onClick={onRemove}
          className="absolute top-1/2 right-2 -translate-y-1/2 opacity-60 hover:bg-accent hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-ring/50"
        >
          {unfollow ? <StarOff className="size-3.5" /> : <X className="size-3.5" />}
        </Button>
      )}
    </div>
  );
}
