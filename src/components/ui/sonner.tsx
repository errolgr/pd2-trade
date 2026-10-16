import { Toaster as Sonner, ToasterProps } from 'sonner';
import React from 'react';
import { useThemeMode } from '@/lib/themes';

const Toaster = ({ ...props }: ToasterProps) => {
  // Follow the active app theme (dark/light) so richColors toasts use the matching palette
  const theme = useThemeMode();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-panel group-[.toaster]:rounded-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-medium',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
