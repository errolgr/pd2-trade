/**
 * PD2 Website Event Types
 * Enums for different requests and responses used in the PD2 website communication
 */

export enum Pd2EventType {
  // Authentication events
  TOKEN_FOUND = 'pd2-token-found',
  GET_AUTH_DATA = 'pd2-get-auth-data',
  GET_AUTH_DATA_RESULT = 'pd2-get-auth-data-result',

  // Market listing events
  GET_MARKET_LISTINGS = 'pd2-get-market-listings',
  GET_MARKET_LISTINGS_RESULT = 'pd2-get-market-listings-result',

  // Item matching events
  FIND_MATCHING_ITEMS = 'pd2-find-matching-items',
  FIND_MATCHING_ITEMS_RESULT = 'pd2-find-matching-items-result',

  // Item listing events
  LIST_SPECIFIC_ITEM = 'pd2-list-specific-item',
  LIST_SPECIFIC_ITEM_RESULT = 'pd2-list-specific-item-result',

// Update market listing events (generic patch)
UPDATE_MARKET_LISTING = 'pd2-update-market-listing',
UPDATE_MARKET_LISTING_RESULT = 'pd2-update-market-listing-result',

// Update stash item by hash events
UPDATE_STASH_ITEM_BY_HASH = 'pd2-update-stash-item-by-hash',
UPDATE_STASH_ITEM_BY_HASH_RESULT = 'pd2-update-stash-item-by-hash-result',
}

export enum Pd2RequestType {
  GET_MARKET_LISTINGS = 'get-market-listings',
  FIND_MATCHING_ITEMS = 'find-matching-items',
  LIST_SPECIFIC_ITEM = 'list-specific-item',
  GET_AUTH_DATA = 'get-auth-data',
}

export enum Pd2ResponseType {
  GET_MARKET_LISTINGS_RESULT = 'get-market-listings-result',
  FIND_MATCHING_ITEMS_RESULT = 'find-matching-items-result',
  LIST_SPECIFIC_ITEM_RESULT = 'list-specific-item-result',
  GET_AUTH_DATA_RESULT = 'get-auth-data-result',
}

export enum Pd2EventCategory {
  AUTHENTICATION = 'authentication',
  MARKET = 'market',
  ITEMS = 'items',
  LISTING = 'listing',
}

/**
 * Helper function to get event type by category and action
 */
export function getEventType(category: Pd2EventCategory, action: string, isResponse = false): string {
  const suffix = isResponse ? '-result' : '';
  return `pd2-${action}${suffix}`;
}

/**
 * Helper function to check if an event type is a response
 */
export function isResponseEvent(eventType: string): boolean {
  return eventType.endsWith('-result');
}

/**
 * Helper function to get the corresponding request event for a response event
 */
export function getRequestEventFromResponse(responseEvent: string): string {
  if (!isResponseEvent(responseEvent)) {
    throw new Error(`Event ${responseEvent} is not a response event`);
  }
  return responseEvent.replace('-result', '');
}

/**
 * Helper function to get the corresponding response event for a request event
 */
export function getResponseEventFromRequest(requestEvent: string): string {
  if (isResponseEvent(requestEvent)) {
    throw new Error(`Event ${requestEvent} is already a response event`);
  }
  return `${requestEvent}-result`;
}

/**
 * Usage Examples:
 * 
 * // Using the enum directly
 * listen(Pd2EventType.GET_MARKET_LISTINGS, handler);
 * emit(Pd2EventType.GET_MARKET_LISTINGS_RESULT, data);
 * 
 * // Using helper functions
 * const requestEvent = getEventType(Pd2EventCategory.MARKET, 'get-market-listings');
 * const responseEvent = getResponseEventFromRequest(requestEvent);
 * 
 * // Type checking
 * if (isResponseEvent(Pd2EventType.GET_MARKET_LISTINGS_RESULT)) {
 *   // This is a response event
 * }
 */ 