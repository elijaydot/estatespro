
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS lease_font text NOT NULL DEFAULT 'Georgia',
ADD COLUMN IF NOT EXISTS lease_primary_color text NOT NULL DEFAULT '#1e3a5f',
ADD COLUMN IF NOT EXISTS lease_secondary_color text NOT NULL DEFAULT '#2563eb',
ADD COLUMN IF NOT EXISTS lease_header_color text NOT NULL DEFAULT '#f0f7ff';
