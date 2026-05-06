import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useActiveCompany } from '@/contexts/ActiveCompanyContext';

export interface Booking {
  id: string;
  property_id: string;
  unit_id: string;
  user_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  nightly_rate: number;
  total_amount: number;
  cleaning_fee: number;
  service_fee: number;
  status: string;
  payment_status: string;
  notes: string | null;
  special_requests: string | null;
  num_guests: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  property_name?: string;
  unit_number?: string;
}

export function useBookings(propertyId?: string) {
  const { activeCompanyId } = useActiveCompany();

  return useQuery({
    queryKey: ['bookings', propertyId, activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select('*, properties(name), units(unit_number)')
        .order('check_in', { ascending: false });

      if (activeCompanyId) {
        const { data: scopedProperties, error: scopedPropertiesError } = await supabase
          .from('properties')
          .select('id')
          .eq('company_id', activeCompanyId);

        if (scopedPropertiesError) throw scopedPropertiesError;

        const propertyIds = (scopedProperties || []).map((property) => property.id);
        if (propertyIds.length === 0) {
          return [] as Booking[];
        }

        query = query.in('property_id', propertyIds);
      }

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((b: any) => ({
        ...b,
        property_name: b.properties?.name,
        unit_number: b.units?.unit_number,
      })) as Booking[];
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (booking: {
      property_id: string;
      unit_id: string;
      guest_name: string;
      guest_email: string;
      guest_phone?: string;
      check_in: string;
      check_out: string;
      nightly_rate: number;
      total_amount: number;
      cleaning_fee?: number;
      service_fee?: number;
      notes?: string;
      special_requests?: string;
      num_guests?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          ...booking,
          user_id: user.id,
          cleaning_fee: booking.cleaning_fee || 0,
          service_fee: booking.service_fee || 0,
          num_guests: booking.num_guests || 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Success', description: 'Booking created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Success', description: 'Booking updated' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Success', description: 'Booking deleted' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
