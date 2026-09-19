'use client';

import React, { Component, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Home, LayoutTemplate, Gavel, Users, Compass, ArrowRight } from 'lucide-react';

interface NotFoundProps {
  title: string;
  description: string;
  backHome: string;
  viewPortfolio: string;
  viewAuctions: string;
  viewCharacters: string;
}

function NotFoundView({
  title,
  description,
  backHome,
  viewPortfolio,
  viewAuctions,
  viewCharacters,
}: NotFoundProps) {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-10 sm:py-16 w-full">
      <div className="relative overflow-hidden bg-[var(--bg-surface,#121215)]/80 backdrop-blur-xl border border-[var(--border-subtle,#27272a)] rounded-3xl p-6 sm:p-10 md:p-12 max-w-2xl w-full shadow-2xl text-center">
        {/* Ambient background glow */}
        <div
          className="absolute -top-24 -left-24 w-64 h-64 bg-[var(--accent-primary,#3b82f6)]/15 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -right-24 w-64 h-64 bg-[var(--accent-secondary,#e2b857)]/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Badge */}
        <div className="relative z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold text-[var(--accent-primary,#3b82f6)] bg-[var(--accent-primary,#3b82f6)]/10 border border-[var(--accent-primary,#3b82f6)]/25 mb-4">
          <Compass className="w-3.5 h-3.5 animate-spin-slow" />
          <span>404 • DICE ROUTING</span>
        </div>

        {/* 404 Headline */}
        <h1 className="relative z-10 text-7xl sm:text-9xl font-black tracking-tighter bg-gradient-to-br from-[var(--text-primary,#f4f4f5)] via-[var(--accent-primary,#3b82f6)] to-[var(--text-muted,#a1a1aa)] bg-clip-text text-transparent select-none leading-none mb-3">
          404
        </h1>

        {/* Localized Title & Description */}
        <h2 className="relative z-10 text-2xl sm:text-3xl font-extrabold text-[var(--text-primary,#f4f4f5)] tracking-tight mb-3">
          {title}
        </h2>
        <p className="relative z-10 text-sm sm:text-base text-[var(--text-muted,#a1a1aa)] max-w-lg mx-auto mb-8 leading-relaxed">
          {description}
        </p>

        {/* Main Home Button */}
        <div className="relative z-10 mb-8 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[var(--accent-primary,#3b82f6)] hover:bg-[var(--accent-hover,#2563eb)] text-white font-bold text-sm sm:text-base shadow-xl shadow-[var(--accent-primary,#3b82f6)]/25 transition-all hover:scale-105 active:scale-95 group cursor-pointer"
          >
            <Home className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span>{backHome}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Quick Navigation Cards */}
        <div className="relative z-10 border-t border-[var(--border-subtle,#27272a)] pt-6">
          <p className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted,#a1a1aa)] mb-4">
            Quick Navigation
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/portfolio"
              className="flex items-center sm:flex-col justify-center gap-2.5 p-3.5 rounded-2xl bg-[var(--bg-primary,#09090b)] hover:bg-[var(--bg-surface-hover,#1c1c21)] border border-[var(--border-subtle,#27272a)] hover:border-[var(--accent-primary,#3b82f6)]/50 text-[var(--text-primary,#f4f4f5)] text-xs sm:text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-0.5 group cursor-pointer"
            >
              <LayoutTemplate className="w-4 h-4 text-[var(--accent-primary,#3b82f6)] group-hover:scale-110 transition-transform" />
              <span>{viewPortfolio}</span>
            </Link>

            <Link
              href="/auctions"
              className="flex items-center sm:flex-col justify-center gap-2.5 p-3.5 rounded-2xl bg-[var(--bg-primary,#09090b)] hover:bg-[var(--bg-surface-hover,#1c1c21)] border border-[var(--border-subtle,#27272a)] hover:border-[var(--accent-primary,#3b82f6)]/50 text-[var(--text-primary,#f4f4f5)] text-xs sm:text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-0.5 group cursor-pointer"
            >
              <Gavel className="w-4 h-4 text-[var(--accent-primary,#3b82f6)] group-hover:scale-110 transition-transform" />
              <span>{viewAuctions}</span>
            </Link>

            <Link
              href="/characters"
              className="flex items-center sm:flex-col justify-center gap-2.5 p-3.5 rounded-2xl bg-[var(--bg-primary,#09090b)] hover:bg-[var(--bg-surface-hover,#1c1c21)] border border-[var(--border-subtle,#27272a)] hover:border-[var(--accent-primary,#3b82f6)]/50 text-[var(--text-primary,#f4f4f5)] text-xs sm:text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-0.5 group cursor-pointer"
            >
              <Users className="w-4 h-4 text-[var(--accent-primary,#3b82f6)] group-hover:scale-110 transition-transform" />
              <span>{viewCharacters}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocalizedNotFound() {
  const t = useTranslations('NotFound');
  return (
    <NotFoundView
      title={t('title')}
      description={t('description')}
      backHome={t('backHome')}
      viewPortfolio={t('viewPortfolio')}
      viewAuctions={t('viewAuctions')}
      viewCharacters={t('viewCharacters')}
    />
  );
}

const FALLBACK_STRINGS: NotFoundProps = {
  title: 'Page Not Found',
  description: 'Sorry, the page you are looking for does not exist or has been moved.',
  backHome: 'Back to Home',
  viewPortfolio: 'Explore Portfolio',
  viewAuctions: 'Active Auctions',
  viewCharacters: 'Original Characters',
};

class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function NotFound() {
  return (
    <ErrorBoundary fallback={<NotFoundView {...FALLBACK_STRINGS} />}>
      <LocalizedNotFound />
    </ErrorBoundary>
  );
}
