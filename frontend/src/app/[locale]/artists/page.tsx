'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function ArtistsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams?.toString();
    const destination = query ? `/?${query}` : '/';
    router.replace(destination);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary,#09090b)] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-10 h-10 text-[var(--accent-primary,#3b82f6)] animate-spin" />
      <p className="text-xs font-bold text-[var(--text-muted,#a1a1aa)] uppercase tracking-widest">
        Redirecting to Artists Directory...
      </p>
    </div>
  );
}

export default function ArtistsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-primary,#09090b)] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-[var(--accent-primary,#3b82f6)] animate-spin" />
          <p className="text-xs font-bold text-[var(--text-muted,#a1a1aa)] uppercase tracking-widest">
            Redirecting to Artists Directory...
          </p>
        </div>
      }
    >
      <ArtistsRedirectContent />
    </Suspense>
  );
}
