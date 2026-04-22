-- Allow short-let properties at DB constraint level
ALTER TABLE public.properties
DROP CONSTRAINT IF EXISTS properties_type_check;

ALTER TABLE public.properties
ADD CONSTRAINT properties_type_check
CHECK (type IN ('apartment', 'house', 'commercial', 'mixed', 'short_let'));
