
-- Add image_urls array column to properties and units for multi-photo gallery
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';
