'use client';

import { useEffect, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Palette, Sparkles } from 'lucide-react';

function PageTransitionLoaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Finish progress when route change settles
    setProgress(100);
    const timer = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept clicks on internal links to trigger top progress bar & loading screen
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor?.href && !anchor.hasAttribute('download')) {
        try {
          const targetUrl = new URL(anchor.href, window.location.href);
          const currentUrl = new URL(window.location.href);

          if (
            targetUrl.protocol === currentUrl.protocol &&
            targetUrl.origin === currentUrl.origin &&
            (targetUrl.pathname !== currentUrl.pathname || targetUrl.search !== currentUrl.search) &&
            !anchor.target &&
            !e.ctrlKey &&
            !e.metaKey
          ) {
            setLoading(true);
            setProgress(30);

            const progressInterval = setInterval(() => {
              setProgress((prev) => (prev >= 85 ? 85 : prev + 15));
            }, 150);

            setTimeout(() => clearInterval(progressInterval), 2000);
          }
        } catch {
          // Ignore invalid URLs
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <>
      {/* Top Glowing Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-1 bg-neutral-950/20">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(56,189,248,0.8)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Fullscreen Translucent Studio Loading Screen */}
      {loading && progress < 100 && (
        <div className="fixed inset-0 z-[9998] bg-neutral-950/60 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none animate-fade-in-scale">
          <div className="bg-neutral-900/90 border border-neutral-800 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center animate-spin">
                <Palette className="w-6 h-6 text-blue-400" />
              </div>
              <Sparkles className="w-4 h-4 text-sky-300 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider uppercase text-white">Loading Studio</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function PageTransitionLoader() {
  return (
    <Suspense fallback={null}>
      <PageTransitionLoaderContent />
    </Suspense>
  );
}
