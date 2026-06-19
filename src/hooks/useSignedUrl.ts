import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSignedUrl(bucket: string, path: string | null) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setSignedUrl(null);
      return;
    }

    // Extract the file path from the full URL if needed
    let filePath = path;
    if (path.includes('/storage/v1/object/public/')) {
      const parts = path.split('/storage/v1/object/public/');
      if (parts[1]) {
        const bucketAndPath = parts[1];
        const bucketPrefix = `${bucket}/`;
        if (bucketAndPath.startsWith(bucketPrefix)) {
          filePath = bucketAndPath.slice(bucketPrefix.length);
        }
      }
    }

    const getSignedUrl = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error: urlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (urlError) {
          setError(urlError.message);
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create signed URL');
        setSignedUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    getSignedUrl();
  }, [bucket, path]);

  return { signedUrl, isLoading, error };
}
