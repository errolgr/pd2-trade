import React, { createContext, useContext, useRef } from 'react';

interface NonClickThroughRefsContextProps {
  registerRef: (el: HTMLElement | null) => void;
  getRefs: () => HTMLElement[];
}

const NonClickThroughRefsContext = createContext<NonClickThroughRefsContextProps | undefined>(undefined);

export const NonClickThroughRefsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // We'll store the refs in a ref. Using a ref ensures it persists without triggering re-renders.
  const refs = useRef<HTMLElement[]>([]);

  const registerRef = (el: HTMLElement | null) => {
    if (el && !refs.current.includes(el)) {
      refs.current.push(el);
    }
  };

  const getRefs = () => {
    return refs.current;
  };

  return (
    <NonClickThroughRefsContext.Provider value={{ registerRef, getRefs }}>
      {children}
    </NonClickThroughRefsContext.Provider>
  );
};

export const useNonClickThroughRefs = (): NonClickThroughRefsContextProps => {
  const context = useContext(NonClickThroughRefsContext);
  if (!context) {
    throw new Error('useNonClickThroughRefs must be used within a NonClickThroughRefsProvider');
  }
  return context;
};
