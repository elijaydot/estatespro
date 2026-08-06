import { createContext } from 'react';

export type CompanyOption = {
  id: string;
  name: string;
};

export type ActiveCompanyContextType = {
  activeCompanyId: string | null;
  activeCompany: CompanyOption | null;
  setActiveCompanyId: (companyId: string | null) => void;
  companies: CompanyOption[];
  isLoading: boolean;
  isResolved: boolean;
};

export const ActiveCompanyContext = createContext<ActiveCompanyContextType | undefined>(undefined);
