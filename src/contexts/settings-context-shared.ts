import { createContext } from 'react';
import type { AppSettings } from './SettingsContext';

export interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  formatCurrency: (amount: number) => string;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
