-- Add notification preference columns to app_settings table
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS email_payments BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS email_maintenance BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS email_lease_expiry BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS email_tenant_invites BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS in_app_payments BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS in_app_maintenance BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS in_app_lease_expiry BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS in_app_messages BOOLEAN NOT NULL DEFAULT true;
