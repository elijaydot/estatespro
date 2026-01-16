import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface LeaseAttachment {
  id: string;
  lease_id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useLeaseAttachments(leaseId: string) {
  return useQuery({
    queryKey: ['lease-attachments', leaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lease_attachments')
        .select('*')
        .eq('lease_id', leaseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeaseAttachment[];
    },
    enabled: !!leaseId,
  });
}

export function useUploadLeaseAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leaseId, 
      file, 
      description 
    }: { 
      leaseId: string; 
      file: File; 
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${leaseId}/${Date.now()}_${file.name}`;
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lease-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create signed URL (valid for 1 year)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('lease-attachments')
        .createSignedUrl(uploadData.path, 31536000); // 1 year in seconds

      if (signedUrlError) throw signedUrlError;

      // Save attachment record
      const { data, error } = await supabase
        .from('lease_attachments')
        .insert({
          lease_id: leaseId,
          user_id: user.id,
          file_name: file.name,
          file_url: signedUrlData.signedUrl,
          file_type: file.type,
          file_size: file.size,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lease-attachments', variables.leaseId] });
      toast({ title: 'Success', description: 'Attachment uploaded successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteLeaseAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, leaseId, fileUrl }: { id: string; leaseId: string; fileUrl: string }) => {
      // Extract file path from URL
      const urlParts = fileUrl.split('/lease-attachments/');
      if (urlParts[1]) {
        const filePath = urlParts[1].split('?')[0];
        await supabase.storage.from('lease-attachments').remove([filePath]);
      }

      const { error } = await supabase
        .from('lease_attachments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lease-attachments', variables.leaseId] });
      toast({ title: 'Success', description: 'Attachment deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
