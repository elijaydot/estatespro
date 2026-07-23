import { useRef, useState } from 'react';
import { Camera, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface InventoryPhotoUploaderProps {
  value: string | null;
  tenantId: string;
  scope: 'move_in' | 'move_out';
  recordId: string;
  disabled?: boolean;
  onChange: (nextValue: string | null) => Promise<void> | void;
}

const BUCKET = 'tenant-exit-inventory';
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function normalizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function InventoryPhotoUploader({
  value,
  tenantId,
  scope,
  recordId,
  disabled,
  onChange,
}: InventoryPhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { signedUrl, isLoading: loadingPreview } = useSignedUrl(BUCKET, value);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please choose an image file.', variant: 'destructive' });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 8MB.', variant: 'destructive' });
      return;
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = normalizeFileName(file.name.replace(new RegExp(`\\.${fileExt}$`), ''));
    const path = `${tenantId}/${scope}/${recordId}/${Date.now()}_${fileName}.${fileExt}`;

    setIsUploading(true);
    try {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
        });

      if (error) throw error;

      await onChange(path);
      toast({ title: 'Photo uploaded', description: 'Evidence photo saved successfully.' });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleUpload(file);
          }
        }}
      />

      <div className="rounded-lg border border-dashed border-border/80 bg-card/70 p-2.5">
        {signedUrl ? (
          <div className="space-y-2">
            <img src={signedUrl} alt="Inventory evidence" className="h-32 w-full rounded-md object-cover" />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={disabled || isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5" />
                Change
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 text-destructive"
                disabled={disabled || isUploading}
                onClick={() => {
                  void onChange(null);
                }}
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            disabled={disabled || isUploading || loadingPreview}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading || loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload Photo Evidence
          </Button>
        )}
      </div>
    </div>
  );
}
