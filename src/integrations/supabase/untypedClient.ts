import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';

export const untypedSupabase = supabase as unknown as SupabaseClient;