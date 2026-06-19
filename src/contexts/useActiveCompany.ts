import { useContext } from 'react';
import { ActiveCompanyContext } from './active-company-context-shared';

export function useActiveCompany() {
  const context = useContext(ActiveCompanyContext);
  if (!context) {
    throw new Error('useActiveCompany must be used within an ActiveCompanyProvider');
  }
  return context;
}
