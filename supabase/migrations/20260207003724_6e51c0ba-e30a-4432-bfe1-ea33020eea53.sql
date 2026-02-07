
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('landlord', 'property_manager', 'tenant');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only allow inserts through triggers/functions (not direct user inserts)
CREATE POLICY "System can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Backfill existing users from profiles table
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 
  CASE 
    WHEN p.role = 'tenant' THEN 'tenant'::app_role
    WHEN p.role = 'property_manager' THEN 'property_manager'::app_role
    ELSE 'property_manager'::app_role
  END
FROM public.profiles p
ON CONFLICT (user_id, role) DO NOTHING;

-- Update handle_new_user to also insert into user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  typed_role app_role;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'property_manager');
  
  IF user_role NOT IN ('tenant', 'property_manager') THEN
    user_role := 'property_manager';
  END IF;
  
  -- Determine typed role
  IF user_role = 'tenant' THEN
    typed_role := 'tenant'::app_role;
  ELSE
    typed_role := 'property_manager'::app_role;
  END IF;
  
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    user_role
  );
  
  INSERT INTO public.app_settings (user_id, currency_code, currency_symbol, default_country)
  VALUES (NEW.id, 'RWF', 'RWF', 'Rwanda');
  
  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, typed_role);
  
  RETURN NEW;
END;
$function$;
