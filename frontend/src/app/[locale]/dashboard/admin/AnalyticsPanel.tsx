import { useQuery } from '@tanstack/react-query';
import { getAnalytics } from '@/lib/api';
import { Loader2, DollarSign, TrendingUp, Briefcase, Gavel } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function AnalyticsPanel() {
  const t = useTranslations('AdminDashboard');
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => getAnalytics(period),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!analytics) return null;

  const totalRevenue = analytics.revenue_data.reduce((sum, item) => sum + item.revenue, 0);

  const pieData = [
    { name: t('adoptableType'), value: analytics.adoptable_revenue },
    { name: t('commissionSlots'), value: analytics.commission_revenue },
  ];
  
  const COLORS = ['#8b5cf6', '#3b82f6']; // Purple and Blue

  return (
    <div className="max-w-6xl w-full mx-auto space-y-8">
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-500" /> 
          {t('revenueAnalytics')}
        </h2>
        <div className="flex bg-neutral-50 dark:bg-neutral-900 rounded-lg p-1 border border-neutral-200 dark:border-neutral-800">
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${
                period === p ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 dark:text-neutral-500 hover:text-white'
              }`}
            >
              {t(p)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-500 font-bold uppercase tracking-wider block">{t('totalRevenue')}</span>
            <span className="text-2xl font-black text-neutral-900 dark:text-white">฿{totalRevenue.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-500 font-bold uppercase tracking-wider block">{t('avgWinningBid')}</span>
            <span className="text-2xl font-black text-neutral-900 dark:text-white">฿{analytics.average_winning_bid.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-500 font-bold uppercase tracking-wider block">{t('adoptables')}</span>
            <span className="text-2xl font-black text-neutral-900 dark:text-white">฿{analytics.adoptable_revenue.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center shrink-0">
            <Gavel className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-500 font-bold uppercase tracking-wider block">{t('commissionSlots')}</span>
            <span className="text-2xl font-black text-neutral-900 dark:text-white">฿{analytics.commission_revenue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-6 uppercase tracking-wider">{t('revenueOverTime')}</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.revenue_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="period" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `฿${value}`} />
                <Tooltip 
                  cursor={{ fill: '#262626' }}
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }}
                  formatter={(value) => [`฿${Number(value ?? 0).toLocaleString()}`, t('revenue')]}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-6 uppercase tracking-wider">{t('revenueByType')}</h3>
          <div className="h-80 w-full flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }}
                  formatter={(value) => [`฿${Number(value ?? 0).toLocaleString()}`, t('revenue')]}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend */}
            <div className="flex gap-4 mt-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
