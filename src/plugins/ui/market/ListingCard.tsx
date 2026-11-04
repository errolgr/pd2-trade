import React from 'react';
import { Button } from '@pd2-trader/ui';
import type { Listing } from '../../marketplace/api';
import type { ListingState } from '../../marketplace/listing-state';
import type { Installer } from './installer';
import { AccessChips, CompatibilityNote, ListingAction, ListingIcon, ListingMeta } from './parts';

export interface ListingHandlers {
  stateOf: (listing: Pick<Listing, 'id' | 'latestVersion'>) => ListingState;
  installer: Installer;
  onOpen: (id: string) => void;
  onUpdate: (id: string) => void;
}

/** One marketplace listing in a grid or shelf: icon, name, rating, installs, access and the install action. */
export function ListingCard({ listing, handlers }: { listing: Listing; handlers: ListingHandlers }) {
  return (
    <article className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-card/60 p-2.5">
      <div className="flex items-start gap-2">
        <ListingIcon listing={listing} />
        <div className="min-w-0 flex-1">
          <Button
            variant="link"
            className="h-auto max-w-full justify-start truncate p-0 text-sm font-semibold text-foreground"
            onClick={() => handlers.onOpen(listing.id)}
          >
            {listing.name}
          </Button>
          <ListingMeta listing={listing} />
        </div>
        <ListingAction
          listing={listing}
          state={handlers.stateOf(listing)}
          installer={handlers.installer}
          onUpdate={() => handlers.onUpdate(listing.id)}
        />
      </div>
      {listing.summary && <p className="line-clamp-2 text-muted-foreground">{listing.summary}</p>}
      <CompatibilityNote listing={listing} />
      <AccessChips permissions={listing.permissions}
        network={listing.network} />
    </article>
  );
}
