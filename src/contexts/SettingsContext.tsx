import React, { useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isAbortLikeError } from '@/lib/errors';
import { useAuth } from './useAuth';
import { SettingsContext, SettingsContextType } from './settings-context-shared';

export interface AppSettings {
  id?: string;
  currencyCode: string;
  currencySymbol: string;
  defaultCountry: string;
  timezone: string;
  dateFormat: string;
  accentColor: string;
  leaseFont: string;
  leasePrimaryColor: string;
  leaseSecondaryColor: string;
  leaseHeaderColor: string;
}

const defaultSettings: AppSettings = {
  currencyCode: 'RWF',
  currencySymbol: 'RWF',
  defaultCountry: 'Rwanda',
  timezone: 'Africa/Kigali',
  dateFormat: 'DD/MM/YYYY',
  accentColor: '#f59e0b',
  leaseFont: 'Georgia',
  leasePrimaryColor: '#1e3a5f',
  leaseSecondaryColor: '#2563eb',
  leaseHeaderColor: '#f0f7ff',
};

type AppSettingsRow = {
  id: string;
  currency_code: string;
  currency_symbol: string;
  default_country: string;
  timezone: string;
  date_format: string;
  accent_color: string | null;
  lease_font?: string | null;
  lease_primary_color?: string | null;
  lease_secondary_color?: string | null;
  lease_header_color?: string | null;
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSettings();
    } else {
      setSettings(defaultSettings);
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const fetchSettings = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
      }

      if (data) {
        const settingsRow = data as unknown as AppSettingsRow;
        setSettings({
          id: settingsRow.id,
          currencyCode: settingsRow.currency_code,
          currencySymbol: settingsRow.currency_symbol,
          defaultCountry: settingsRow.default_country,
          timezone: settingsRow.timezone,
          dateFormat: settingsRow.date_format,
          accentColor: settingsRow.accent_color || '#f59e0b',
          leaseFont: settingsRow.lease_font || 'Georgia',
          leasePrimaryColor: settingsRow.lease_primary_color || '#1e3a5f',
          leaseSecondaryColor: settingsRow.lease_secondary_color || '#2563eb',
          leaseHeaderColor: settingsRow.lease_header_color || '#f0f7ff',
        });
      }
    } catch (error) {
      if (!isAbortLikeError(error)) {
        console.error('Error fetching settings:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const updateData: Record<string, unknown> = {};
      if (newSettings.currencyCode !== undefined) updateData.currency_code = newSettings.currencyCode;
      if (newSettings.currencySymbol !== undefined) updateData.currency_symbol = newSettings.currencySymbol;
      if (newSettings.defaultCountry !== undefined) updateData.default_country = newSettings.defaultCountry;
      if (newSettings.timezone !== undefined) updateData.timezone = newSettings.timezone;
      if (newSettings.dateFormat !== undefined) updateData.date_format = newSettings.dateFormat;
      if (newSettings.accentColor !== undefined) updateData.accent_color = newSettings.accentColor;
      if (newSettings.leaseFont !== undefined) updateData.lease_font = newSettings.leaseFont;
      if (newSettings.leasePrimaryColor !== undefined) updateData.lease_primary_color = newSettings.leasePrimaryColor;
      if (newSettings.leaseSecondaryColor !== undefined) updateData.lease_secondary_color = newSettings.leaseSecondaryColor;
      if (newSettings.leaseHeaderColor !== undefined) updateData.lease_header_color = newSettings.leaseHeaderColor;

      const { error } = await supabase
        .from('app_settings')
        .update(updateData)
        .eq('user_id', authUser.id);

      if (error) {
        console.error('Error updating settings:', error);
        throw error;
      }

      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const formatCurrency = (amount: number): string => {
    return `${settings.currencySymbol} ${amount.toLocaleString()}`;
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings, formatCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}
