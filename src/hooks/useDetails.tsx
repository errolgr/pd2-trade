import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import DetailsBarLayout from '@/components/dialogs/details/details-bar-layout';
import { IAbilityBreakdownResult, Segment } from '@dmg-meter/types';
import { DetailView } from '@/components/dialogs/details/details-view';

interface DetailsFilter {
  segment: Segment;
  encounterId: string;
  playerId: string;
  playerName: string;
}
interface DetailsContextProps {
  isOpen: boolean;
  openDetails: (filter?: DetailsFilter) => void;
  closeDetails: () => void;
  filter: DetailsFilter | null;
  setFilter: (filter: DetailsFilter | ((prevFilter: DetailsFilter) => DetailsFilter)) => void;
  selectedAbility: IAbilityBreakdownResult;
  setSelectedAbility: (
    ability: IAbilityBreakdownResult | ((prevAbility: IAbilityBreakdownResult) => IAbilityBreakdownResult),
  ) => void;
}

// Create the context
const DetailsContext = React.createContext<DetailsContextProps | undefined>(undefined);

// Provider component that wraps your app (or part of it)
export const DetailsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const openDetails = (filter?: DetailsFilter) => {
    if (filter) {
      setFilter(filter);
    }
    setIsOpen(true);
  };
  const closeDetails = () => setIsOpen(false);
  const [selectedAbility, setSelectedAbility] = React.useState<IAbilityBreakdownResult>();
  const [filter, setFilter] = React.useState<DetailsFilter | null>(null);

  return (
    <DetailsContext.Provider
      value={{ isOpen, openDetails, closeDetails, filter, setFilter, selectedAbility, setSelectedAbility }}
    >
      {children}
      <Dialog open={isOpen}
        onOpenChange={setIsOpen}>
        <DetailsBarLayout>
          <DetailView />
        </DetailsBarLayout>
      </Dialog>
    </DetailsContext.Provider>
  );
};

// Custom hook to access the dialog context
export const useDetails = () => {
  const context = React.useContext(DetailsContext);
  if (context === undefined) {
    throw new Error('useDetails must be used within a DetailProvider');
  }
  return context;
};
