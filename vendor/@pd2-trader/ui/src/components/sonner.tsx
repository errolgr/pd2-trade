import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';

/** Toast host. `theme` is the app's light/dark mode so `richColors` toasts use the matching palette. */
const Toaster = ({ theme, ...props }: ToasterProps & { theme: 'light' | 'dark' }) => {
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

export { Toaster, toast };
