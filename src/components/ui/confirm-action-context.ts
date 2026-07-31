import { createContext } from 'react';

export type ConfirmationOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
};

export type ConfirmAction = (options: ConfirmationOptions) => Promise<boolean>;

export const ConfirmActionContext = createContext<ConfirmAction | null>(null);
