'use client';
import PaymentSettingsPanel from '@/components/payments/PaymentSettingsPanel';
import LedgerPanel from '@/components/payments/LedgerPanel';
export default function PaymentsPage() {
  return <div className="space-y-8"><PaymentSettingsPanel /><LedgerPanel admin /></div>;
}
