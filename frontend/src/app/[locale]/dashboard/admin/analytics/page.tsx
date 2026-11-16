'use client';

import AnalyticsPanel from '../AnalyticsPanel';
import LedgerPanel from '@/components/payments/LedgerPanel';

export default function AnalyticsAdminModule() {
  return (
    <div className="space-y-6">
      <LedgerPanel admin />
      <AnalyticsPanel />
    </div>
  );
}
