'use client';

import { useTranslations } from 'next-intl';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalytics } from '@/lib/api';
import LedgerPanel from '@/components/payments/LedgerPanel';
import {
  DollarSign,
  Briefcase,
  Gavel,
  Loader2,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

export default function ArtistAnalyticsPage() {
  const studio = useTranslations('Studio');
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['artist-analytics', period],
    queryFn: () => getAnalytics(period),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs text-[var(--text-muted)] font-bold tracking-normal">
          Loading Earnings & Financial Stats...
        </p>
      </div>
    );
  }

  if (!analytics) return null;

  const totalRevenue = analytics.revenue_data.reduce((sum, item) => sum + item.revenue, 0);
  const pieData = [
    { name: studio('analytics_54_0'), value: analytics.commission_revenue },
    { name: studio('analytics_55_0'), value: analytics.adoptable_revenue },
  ];

  const colors = ['var(--accent-primary)', 'var(--text-muted)'];
  const tooltipStyle = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-soft)',
  };
  const hasRevenueSources = pieData.some(({value}) => value > 0);

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)]">{studio('analytics_72_0')}</h1>
            <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">
              {' '}{studio('analytics_74_0')}{' '}</p>
          </div>

          {/* Time Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-1">
            {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)] ${
                  period === p
                    ? 'bg-[var(--accent-solid)] text-[var(--accent-contrast)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p === 'week' ? studio('analytics_90_1') : p === 'month' ? studio('analytics_90_2') : p === 'quarter' ? studio('analytics_90_3') : studio('analytics_90_4')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 rounded-2xl flex items-center gap-3 hover:border-[var(--border-hover)] transition-colors">
          <div className="w-12 h-12 bg-[var(--accent-soft)] rounded-2xl border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-[var(--accent-primary)]" />
          </div>
          <div>
            <span className="text-[11px] text-[var(--text-muted)] font-bold tracking-normal block">{studio('analytics_105_0')}</span>
            <span className="text-2xl font-semibold text-[var(--text-primary)]">฿{totalRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Commission Revenue */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 rounded-2xl flex items-center gap-3 hover:border-[var(--border-hover)] transition-colors">
          <div className="w-12 h-12 bg-[var(--accent-soft)] rounded-2xl border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6 text-[var(--accent-primary)]" />
          </div>
          <div>
            <span className="text-[11px] text-[var(--text-muted)] font-bold tracking-normal block">{studio('analytics_116_0')}</span>
            <span className="text-2xl font-semibold text-[var(--text-primary)]">฿{analytics.commission_revenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Adoptable Auctions Revenue */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 rounded-2xl flex items-center gap-3 hover:border-[var(--border-hover)] transition-colors">
          <div className="w-12 h-12 bg-[var(--accent-soft)] rounded-2xl border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
            <Gavel className="w-6 h-6 text-[var(--accent-primary)]" />
          </div>
          <div>
            <span className="text-[11px] text-[var(--text-muted)] font-bold tracking-normal block">{studio('analytics_127_0')}</span>
            <span className="text-2xl font-semibold text-[var(--text-primary)]">฿{analytics.adoptable_revenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Completed Orders & Clients */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 rounded-2xl flex items-center gap-3 hover:border-[var(--border-hover)] transition-colors">
          <div className="w-12 h-12 bg-[var(--accent-soft)] rounded-2xl border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-[var(--accent-primary)]" />
          </div>
          <div>
            <span className="text-[11px] text-[var(--text-muted)] font-bold tracking-normal block">{studio('analytics_138_0')}</span>
            <span className="text-2xl font-semibold text-[var(--text-primary)]">
              {analytics.completed_orders_count || 0} <span className="text-xs font-normal text-[var(--text-muted)]">{studio('analytics_140_0')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Bar Chart */}
        <div className="lg:col-span-2 min-w-0 bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-6 rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[var(--accent-primary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-normal">{studio('analytics_153_0')}</h3>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">{studio('analytics_155_0')}</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.revenue_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="period" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `฿${val}`} />
                <Tooltip
                  cursor={{ fill: 'var(--accent-primary)', fillOpacity: 0.10, radius: 6 }}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  formatter={(val) => [`฿${Number(val ?? 0).toLocaleString()}`, studio('analytics_167_0')]}
                />
                <Bar dataKey="revenue" fill="var(--accent-primary)" activeBar={{ fill: "var(--accent-solid)" }} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Sources Pie Chart */}
        <div className="min-w-0 bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 sm:p-6 rounded-2xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="w-5 h-5 text-[var(--accent-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-normal">{studio('analytics_179_0')}</h3>
          </div>

          <div className="h-64 w-full grid place-items-center my-auto">
            {hasRevenueSources ? <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  formatter={(val) => [`฿${Number(val ?? 0).toLocaleString()}`, studio('analytics_201_0')]}
                />
              </PieChart>
            </ResponsiveContainer> : (
              <div className="flex flex-col items-center gap-3 text-center text-sm text-[var(--text-muted)]">
                <PieIcon aria-hidden="true" className="size-8 text-[var(--accent-primary)]" />
                <p>{studio('analyticsNoRevenue')}</p>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index] }}></div>
                  <span className="text-[var(--text-muted)] font-medium">{entry.name}</span>
                </div>
                <span className="font-bold text-[var(--text-primary)]">฿{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <LedgerPanel />
    </div>
  );
}
