// components/DialogProvider.tsx
import React, { createContext, useContext, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";

interface DialogContextProps {
  openDialog: (content: React.ReactNode) => void;
  closeDialog: () => void;
}

const DialogContext = createContext<DialogContextProps | undefined>(undefined);

export const useDialog = (): DialogContextProps => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<React.ReactNode>(null);

  const openDialog = (content: React.ReactNode) => {
    setDialogContent(content);
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    // Optionally clear content and text after closing
    setDialogContent(null);
  };

  return (
    <DialogContext.Provider value={{ openDialog, closeDialog }}>
      {children}
      <AlertDialog
        open={isOpen}
        onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          // Reset state when dialog is closed via external actions
          setDialogContent(null);
        }
      }}>
        <AlertDialogContent>
          {dialogContent}
        </AlertDialogContent>
      </AlertDialog>
    </DialogContext.Provider>
  );
};
