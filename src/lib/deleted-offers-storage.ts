/**
 * Utility for managing deleted outgoing website offers in localStorage.
 * Deleted offers are kept for 7 days before being purged.
 */

const STORAGE_KEY = 'pd2-deleted-outgoing-offers';
const PURGE_DAYS = 7;

interface DeletedOffer {
  offerId: string;
  deletedAt: number; // timestamp in milliseconds
}

/**
 * Get all deleted offer IDs from localStorage
 */
export function getDeletedOffers(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();

    const deletedOffers: DeletedOffer[] = JSON.parse(stored);
    const now = Date.now();
    const sevenDaysAgo = now - PURGE_DAYS * 24 * 60 * 60 * 1000;

    // Filter out offers older than 7 days
    const validOffers = deletedOffers.filter((offer) => offer.deletedAt > sevenDaysAgo);

    // If we filtered out any, update storage
    if (validOffers.length !== deletedOffers.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validOffers));
    }

    return new Set(validOffers.map((offer) => offer.offerId));
  } catch (error) {
    console.error('Failed to get deleted offers from localStorage:', error);
    return new Set();
  }
}

/**
 * Get all deleted offers with their metadata
 */
export function getDeletedOffersWithMetadata(): DeletedOffer[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const deletedOffers: DeletedOffer[] = JSON.parse(stored);
    const now = Date.now();
    const sevenDaysAgo = now - PURGE_DAYS * 24 * 60 * 60 * 1000;

    // Filter out offers older than 7 days
    const validOffers = deletedOffers.filter((offer) => offer.deletedAt > sevenDaysAgo);

    // If we filtered out any, update storage
    if (validOffers.length !== deletedOffers.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validOffers));
    }

    return validOffers;
  } catch (error) {
    console.error('Failed to get deleted offers with metadata from localStorage:', error);
    return [];
  }
}

/**
 * Mark an offer as deleted
 */
export function markOfferAsDeleted(offerId: string): void {
  try {
    const deletedOffers = Array.from(getDeletedOffers());
    const now = Date.now();

    // Check if already deleted
    if (deletedOffers.includes(offerId)) {
      return;
    }

    // Add new deleted offer
    const stored = localStorage.getItem(STORAGE_KEY);
    const offers: DeletedOffer[] = stored ? JSON.parse(stored) : [];
    offers.push({ offerId, deletedAt: now });

    // Purge old offers before saving
    const sevenDaysAgo = now - PURGE_DAYS * 24 * 60 * 60 * 1000;
    const validOffers = offers.filter((offer) => offer.deletedAt > sevenDaysAgo);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(validOffers));
  } catch (error) {
    console.error('Failed to mark offer as deleted:', error);
  }
}

/**
 * Remove an offer from deleted list (if it was restored or should be shown again)
 */
export function unmarkOfferAsDeleted(offerId: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const offers: DeletedOffer[] = JSON.parse(stored);
    const filtered = offers.filter((offer) => offer.offerId !== offerId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to unmark offer as deleted:', error);
  }
}

/**
 * Purge all deleted offers older than 7 days
 */
export function purgeOldDeletedOffers(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const offers: DeletedOffer[] = JSON.parse(stored);
    const now = Date.now();
    const sevenDaysAgo = now - PURGE_DAYS * 24 * 60 * 60 * 1000;

    const validOffers = offers.filter((offer) => offer.deletedAt > sevenDaysAgo);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validOffers));
  } catch (error) {
    console.error('Failed to purge old deleted offers:', error);
  }
}
