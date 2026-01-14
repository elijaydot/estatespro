-- Create app_settings table for configurable currency and country
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'RWF',
  currency_symbol TEXT NOT NULL DEFAULT 'RWF',
  default_country TEXT NOT NULL DEFAULT 'Rwanda',
  timezone TEXT NOT NULL DEFAULT 'Africa/Kigali',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for app_settings
CREATE POLICY "Users can view their own settings"
ON public.app_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.app_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.app_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Create recurring_bills table for amenities like Water, Security per tenant
CREATE TABLE public.recurring_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bill_type TEXT NOT NULL DEFAULT 'utility',
  amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for recurring_bills
ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;

-- Create policies for recurring_bills
CREATE POLICY "Users can view their own recurring bills"
ON public.recurring_bills FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring bills"
ON public.recurring_bills FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring bills"
ON public.recurring_bills FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring bills"
ON public.recurring_bills FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at on app_settings
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on recurring_bills
CREATE TRIGGER update_recurring_bills_updated_at
BEFORE UPDATE ON public.recurring_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'property_manager')
  );
  
  -- Create default settings with RWF and Rwanda
  INSERT INTO public.app_settings (user_id, currency_code, currency_symbol, default_country)
  VALUES (NEW.id, 'RWF', 'RWF', 'Rwanda');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();