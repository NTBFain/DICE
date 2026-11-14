'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function SecureImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const t = useTranslations('SecureImage');
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;
    let active = true;
    let localImageUrl = '';

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await apiClient.get(src.replace(/^\/api(?=\/)/, ''), { responseType: 'blob' });
        if (active) {
          const url = window.URL.createObjectURL(response.data);
          localImageUrl = url;
          setImageSrc(url);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load secure image', err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      active = false;
      if (localImageUrl) {
        window.URL.revokeObjectURL(localImageUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 ${className}`}>
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-950/20 border border-red-900/30 text-red-400 text-xs p-2 text-center ${className}`}>
        {t('failedToLoad')}
      </div>
    );
  }

  return imageSrc ? (
    <img src={imageSrc} alt={alt} className={className} />
  ) : null;
}
