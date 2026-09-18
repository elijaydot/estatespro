import React, { useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isAbortLikeError } from '@/lib/errors';
import { useAuth } from './useAuth';
import { SettingsContext, SettingsContextType } from './settings-context-shared';
import { applyAccentColor } from '@/lib/appearance';

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

const SETTINGS_STORAGE_KEY = 'fishgate_app_settings';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            return { ...defaultSettings, ...parsed };
          }
        }
      } catch {
        // Ignore cache read errors
      }
    }
    return defaultSettings;
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSettings();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    applyAccentColor(settings.accentColor);
  }, [settings.accentColor]);

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
        const loaded: AppSettings = {
          id: settingsRow.id,
          currencyCode: settingsRow.currency_code || defaultSettings.currencyCode,
          currencySymbol: settingsRow.currency_symbol || defaultSettings.currencySymbol,
          defaultCountry: settingsRow.default_country || defaultSettings.defaultCountry,
          timezone: settingsRow.timezone || defaultSettings.timezone,
          dateFormat: settingsRow.date_format || defaultSettings.dateFormat,
          accentColor: settingsRow.accent_color || '#f59e0b',
          leaseFont: settingsRow.lease_font || 'Georgia',
          leasePrimaryColor: settingsRow.lease_primary_color || '#1e3a5f',
          leaseSecondaryColor: settingsRow.lease_secondary_color || '#2563eb',
          leaseHeaderColor: settingsRow.lease_header_color || '#f0f7ff',
        };
        setSettings(loaded);
        try {
          window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(loaded));
        } catch {
          // Ignore cache write errors
        }
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

      const updateData: Record<string, unknown> = {
        user_id: authUser.id,
      };
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

      // Use upsert to guarantee persistence whether or not row previously existed
      const { error } = await supabase
        .from('app_settings')
        .upsert(updateData, { onConflict: 'user_id' });

      if (error) {
        console.error('Error updating settings in database:', error);
        throw error;
      }

      const merged = { ...settings, ...newSettings };
      setSettings(merged);
      try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // Ignore cache write errors
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const formatCurrency = (
    amount: number | null | undefined,
    options?: { showCode?: boolean; decimals?: number }
  ): string => {
    if (amount === null || amount === undefined || isNaN(Number(amount))) {
      return `${settings.currencySymbol || 'RWF'} 0`;
    }
    const num = Number(amount);
    const decimals = options?.decimals !== undefined
      ? options.decimals
      : (num % 1 !== 0 ? 2 : 0);

    const formattedNum = num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    const symbol = settings.currencySymbol || settings.currencyCode || 'RWF';
    if (options?.showCode && settings.currencyCode && settings.currencyCode !== symbol) {
      return `${symbol} ${formattedNum} (${settings.currencyCode})`;
    }
    return `${symbol} ${formattedNum}`;
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings, formatCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}
