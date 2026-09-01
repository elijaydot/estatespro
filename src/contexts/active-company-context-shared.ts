import { createContext } from 'react';

export type CompanyOption = {
  id: string;
  name: string;
  email?: string | null;
  address?: string | null;
};

export type ActiveCompanyContextType = {
  activeCompanyId: string | null;
  activeCompany: CompanyOption | null;
  setActiveCompanyId: (companyId: string | null) => void;
  defaultCompanyId: string | null;
  setDefaultCompanyId: (companyId: string) => Promise<void>;
  companies: CompanyOption[];
  isLoading: boolean;
  isResolved: boolean;
};

export const ActiveCompanyContext = createContext<ActiveCompanyContextType | undefined>(undefined);
