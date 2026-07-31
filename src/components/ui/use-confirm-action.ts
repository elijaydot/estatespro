import { useContext } from 'react';
import { ConfirmActionContext } from '@/components/ui/confirm-action-context';

export function useConfirmAction() {
  const context = useContext(ConfirmActionContext);
  if (!context) throw new Error('useConfirmAction must be used within ConfirmActionProvider');
  return context;
}
