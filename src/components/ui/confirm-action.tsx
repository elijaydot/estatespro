import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ConfirmActionContext, type ConfirmationOptions, type ConfirmAction } from '@/components/ui/confirm-action-context';

export function ConfirmActionProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirmAction = useCallback<ConfirmAction>((nextOptions) => {
    resolverRef.current?.(false);
    setOptions(nextOptions);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  return (
    <ConfirmActionContext.Provider value={confirmAction}>
      {children}
      <AlertDialog open={Boolean(options)} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            <AlertDialogDescription>{options?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={options?.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmActionContext.Provider>
  );
}
