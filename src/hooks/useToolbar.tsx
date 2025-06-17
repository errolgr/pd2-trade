import React, {createContext, ReactNode, useContext, useState} from 'react';
import {DamageCategory, HealingCategory, MiscCategory, ViewType} from '@dmg-meter/types';
import {useInstance} from '@/hooks/useInstance';

type AllCategories = HealingCategory | DamageCategory | MiscCategory;

interface ToolbarContextProps {
  title: string;
  setTitle: (title: string) => void;
  viewType: ViewType;
  category: AllCategories;
  setCategory: (viewType: ViewType, category: AllCategories) => void;
}

// Create the context with an undefined default value.
const ToolbarContext = createContext<ToolbarContextProps | undefined>(undefined);

interface ToolbarProviderProps {
  children: ReactNode;
}

// Provider component that holds the state for the toolbar title.
export const ToolbarProvider: React.FC<ToolbarProviderProps> = ({ children }) => {
  const { instance, isLoading } = useInstance();
  const [title, setTitle] = useState<string>();
  const [category, setCategory] = useState<AllCategories>(instance?.category || DamageCategory.DamageDone);
  const [viewType, setViewType] = useState<ViewType>(instance?.viewType || ViewType.Damage);

  if (isLoading) return null;


  const _setCategory = (viewType: ViewType, category: AllCategories) => {
    setViewType(viewType);
    setCategory(category);
  };

  return (
    <ToolbarContext.Provider value={{ title, setTitle, category, setCategory: _setCategory, viewType }}>
      {children}
    </ToolbarContext.Provider>
  );
};

// Custom hook for accessing the toolbar context.
export const useToolbar = (): ToolbarContextProps => {
  const context = useContext(ToolbarContext);
  if (!context) {
    throw new Error('useToolbar must be used within a ToolbarProvider');
  }
  return context;
};
