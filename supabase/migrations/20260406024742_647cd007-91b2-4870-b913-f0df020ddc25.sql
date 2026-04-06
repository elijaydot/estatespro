
-- Allow anonymous users to view short_let properties (for public booking page)
CREATE POLICY "Public view short_let properties" ON public.properties
  FOR SELECT TO anon
  USING (type = 'short_let');

-- Allow anonymous users to view units of short_let properties
CREATE POLICY "Public view short_let units" ON public.units
  FOR SELECT TO anon
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE type = 'short_let'
    )
  );
