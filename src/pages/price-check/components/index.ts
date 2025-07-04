// Main component
export { default as ItemOverlayWidget } from './ItemOverlayWidget';

// Sub-components
export { RunePricePopover } from './RunePricePopover';
export { StatRow } from './StatRow';

// Hooks
export { useRuneData } from '../hooks/useRuneData';
export { useStatSelection } from '../hooks/useStatSelection';

// Services
export { 
  fetchEconomyData, 
  sortItemsByPrice, 
  calculateRuneValues, 
  getRuneBreakdown 
} from '../lib/economyService';
export { buildTradeUrl } from '../lib/tradeUrlBuilder';

// Utilities
export { getTypeFromBaseType, getStatKey } from '../lib/utils';

// Types
export type { 
  Props, 
  ItemData, 
  ItemValue, 
  RuneCombination 
} from '../lib/types';
export { ECONOMY_API_MAP, RANGE_MARGIN } from '../lib/types'; 