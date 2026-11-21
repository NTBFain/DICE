'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export default function StripeInvoiceSync({invoiceId, orderId}: {invoiceId: number; orderId: number}) {
  const queryClient = useQueryClient();
  useQuery({
    queryKey: ['stripe-invoice-status', invoiceId],
    queryFn: async ({signal}) => {
      const {data} = await apiClient.post<{is_paid: boolean}>(
        `/payments/invoices/${invoiceId}/checkout/status`, undefined, {signal, timeout: 25_000},
      );
      void queryClient.invalidateQueries({queryKey: ['invoices', orderId]});
      void queryClient.invalidateQueries({queryKey: ['order-invoices', orderId]});
      return data.is_paid;
    },
    staleTime: 20_000,
    refetchInterval: query => query.state.data === true ? false : 20_000,
    retry: false,
  });
  return null;
}
