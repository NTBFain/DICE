'use client';

import { useTranslations } from 'next-intl';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAnalytics } from '@/lib/api';
import {
  DollarSign,
  TrendingUp,
  Briefcase,
  Gavel,
  Loader2,
  Users,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart2,
  Calendar,
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
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
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

  const COLORS = ['#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-neutral-900 to-indigo-900/40 border border-blue-800/40 p-6 rounded-2xl relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                Atelier Financial Analytics
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{studio('analytics_72_0')}</h1>
            <p className="text-neutral-400 text-xs sm:text-sm mt-1">
              {' '}{studio('analytics_74_0')}{' '}</p>
          </div>

          {/* Time Filter Tabs */}
          <div className="flex items-center bg-neutral-950/80 p-1.5 rounded-xl border border-neutral-800 shrink-0">
            {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${
                  period === p
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
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
        <div className="bg-neutral-900/60 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4 shadow-md hover:border-blue-500/40 transition-colors">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block">{studio('analytics_105_0')}</span>
            <span className="text-2xl font-black text-white">฿{totalRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Commission Revenue */}
        <div className="bg-neutral-900/60 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4 shadow-md hover:border-blue-500/40 transition-colors">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block">{studio('analytics_116_0')}</span>
            <span className="text-2xl font-black text-white">฿{analytics.commission_revenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Adoptable Auctions Revenue */}
        <div className="bg-neutral-900/60 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4 shadow-md hover:border-purple-500/40 transition-colors">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl border border-purple-500/20 flex items-center justify-center shrink-0">
            <Gavel className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block">{studio('analytics_127_0')}</span>
            <span className="text-2xl font-black text-white">฿{analytics.adoptable_revenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Completed Orders & Clients */}
        <div className="bg-neutral-900/60 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4 shadow-md hover:border-emerald-500/40 transition-colors">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider block">{studio('analytics_138_0')}</span>
            <span className="text-2xl font-black text-white">
              {analytics.completed_orders_count || 0} <span className="text-xs font-normal text-neutral-400">{studio('analytics_140_0')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Bar Chart */}
        <div className="lg:col-span-2 bg-neutral-900/60 border border-neutral-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">{studio('analytics_153_0')}</h3>
            </div>
            <span className="text-xs text-neutral-400 font-mono">{studio('analytics_155_0')}</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.revenue_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="period" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `฿${val}`} />
                <Tooltip
                  cursor={{ fill: '#262626' }}
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                  formatter={(val) => [`฿${Number(val ?? 0).toLocaleString()}`, studio('analytics_167_0')]}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Sources Pie Chart */}
        <div className="bg-neutral-900/60 border border-neutral-800 p-6 rounded-2xl shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">{studio('analytics_179_0')}</h3>
          </div>

          <div className="h-64 w-full flex flex-col items-center justify-center relative my-auto">
            <ResponsiveContainer width="100%" height="100%">
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                  formatter={(val) => [`฿${Number(val ?? 0).toLocaleString()}`, studio('analytics_201_0')]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-neutral-800/80">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-neutral-300 font-medium">{entry.name}</span>
                </div>
                <span className="font-bold text-white">฿{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
