import { useEffect, useRef, useState } from 'react';
import { FileUp, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface DocumentUploaderProps {
  bucket: string;
  pathPrefix: string;
  onUploaded: (storagePath: string, mimeType: string) => void;
  acceptedMimeTypes: string[];
  maxFileSizeBytes: number;
  disabled?: boolean;
  resetKey?: string;
  uploadLabel?: string;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function humanFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${bytes}B`;
}

export function DocumentUploader({
  bucket,
  pathPrefix,
  onUploaded,
  acceptedMimeTypes,
  maxFileSizeBytes,
  disabled = false,
  resetKey,
  uploadLabel = 'Upload document',
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploadedMimeType, setUploadedMimeType] = useState<string | null>(null);
  const { signedUrl, isLoading: isLoadingPreview } = useSignedUrl(bucket, uploadedPath);

  useEffect(() => {
    setUploadedPath(null);
    setUploadedMimeType(null);
  }, [resetKey]);

  const handleUpload = async (file: File) => {
    if (!acceptedMimeTypes.includes(file.type)) {
      toast({
        title: 'Unsupported file type',
        description: `Accepted types: ${acceptedMimeTypes.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    if (file.size > maxFileSizeBytes) {
      toast({
        title: 'File too large',
        description: `Maximum size is ${humanFileSize(maxFileSizeBytes)}.`,
        variant: 'destructive',
      });
      return;
    }

    const ext = file.name.split('.').pop() || 'bin';
    const baseName = sanitizeFileName(file.name.replace(new RegExp(`\\.${ext}$`), ''));
    const storagePath = `${pathPrefix}/${Date.now()}_${baseName}.${ext}`;

    setIsUploading(true);

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type,
        });

      if (error) throw error;

      setUploadedPath(storagePath);
      setUploadedMimeType(file.type);
      onUploaded(storagePath, file.type);

      toast({
        title: 'Upload complete',
        description: 'Document uploaded successfully.',
      });
    } catch (error: unknown) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unable to upload document.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleUpload(file);
          event.currentTarget.value = '';
        }}
        disabled={disabled || isUploading}
        accept={acceptedMimeTypes.join(',')}
      />

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" disabled={disabled || isUploading} onClick={() => inputRef.current?.click()}>
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
          {isUploading ? 'Uploading...' : uploadLabel}
        </Button>
        {(isUploading || uploadedPath) && (
          <span className="text-xs text-muted-foreground">
            {isUploading ? 'Upload in progress' : 'Upload progress: 100%'}
          </span>
        )}
      </div>

      {uploadedPath && (
        <div className="rounded-md border border-border/70 bg-muted/20 p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-muted-foreground">{uploadedPath}</p>
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-input"
              onClick={() => {
                setUploadedPath(null);
                setUploadedMimeType(null);
              }}
              aria-label="Clear uploaded file"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {isLoadingPreview && <p className="text-xs text-muted-foreground">Preparing preview...</p>}

          {!isLoadingPreview && signedUrl && uploadedMimeType?.startsWith('image/') && (
            <img src={signedUrl} alt="Uploaded preview" className="max-h-40 rounded border border-border/60 object-contain" />
          )}

          {!isLoadingPreview && signedUrl && uploadedMimeType === 'application/pdf' && (
            <a href={signedUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
              Open uploaded PDF
            </a>
          )}
        </div>
      )}
    </div>
  );
}
