import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Loader2 } from 'lucide-react';

interface SignedImageProps {
  bucket: string;
  path: string | null;
  alt: string;
  className?: string;
}

export function SignedImage({ bucket, path, alt, className }: SignedImageProps) {
  const { signedUrl, isLoading } = useSignedUrl(bucket, path);

  if (!path) return null;
  
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!signedUrl) return null;

  return <img src={signedUrl} alt={alt} className={className} />;
}
