'use client';

import { parseApiDate } from '@/lib/apiDate';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrders, getInvoices, payInvoice, getRevisions, requestRevision,
  getFiles, downloadOrderFile, getCommissionStatus, Order, OrderFile,
  updateMe, uploadAvatar, getMyCollection
} from '@/lib/api';
import { getMyCommissionRequests, withdrawCommissionRequest } from '@/lib/commissionApi';
import { CommissionRequest } from '@/types/commission';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { invoiceTitle as localizedInvoiceTitle } from '@/lib/invoiceTitle';
import {
  Plus, Loader2, Calendar, FileCheck, Upload, CheckCircle, HelpCircle,
  FileText, AlertCircle, ArrowDownToLine, Lock, RefreshCw, ArrowLeft,
  User, Image as ImageIcon, Briefcase, Camera, Save
} from 'lucide-react';
import SecureImage from '@/components/SecureImage';
import PromptPayButton from '@/components/payments/PromptPayButton';
import CommissionBriefView from '@/components/commission/CommissionBriefView';
import ChatBox from '@/components/ChatBox';
import { getDownloadErrorMessage } from '@/lib/errorMessage';

function ClientDashboardContent() {
  const { user, loading: authLoading, fetchUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('ClientDashboard');
  const queryClient = useQueryClient();
  const locale = useLocale();
  
  // Keep the current view in the URL so locale changes, refresh and Back retain it.
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam === 'collection' || tabParam === 'profile' ? tabParam : 'commissions';
  const parsedOrderId = parseInt(searchParams.get('order') || '', 10);
  const selectedOrderId = activeTab === 'commissions' && !isNaN(parsedOrderId) ? parsedOrderId : null;

  const navigateDashboard = (tab: 'commissions' | 'collection' | 'profile', orderId: number | null = null) => {
    const params = new URLSearchParams(window.location.search);
    if (tab === 'commissions') params.delete('tab');
    else params.set('tab', tab);
    if (orderId === null) params.delete('order');
    else params.set('order', String(orderId));
    const query = params.toString();
    window.history.pushState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  };

  const [revisionDrafts, setRevisionDrafts] = useState<Record<number, string>>({});
  const revisionFeedback = selectedOrderId === null ? '' : revisionDrafts[selectedOrderId] || '';
  const setRevisionFeedback = (feedback: string) => {
    if (selectedOrderId !== null) setRevisionDrafts(drafts => ({ ...drafts, [selectedOrderId]: feedback }));
  };
  const [uploadingSlipId, setUploadingSlipId] = useState<number | null>(null);
  const [slipError, setSlipError] = useState<{ invoiceId: number; message: string } | null>(null);
  const [downloadError, setDownloadError] = useState<{ fileId: number; message: string; paymentVersion: string } | null>(null);
  const [revisionSubmittedId, setRevisionSubmittedId] = useState<number | null>(null);
  const revisionSubmitted = selectedOrderId !== null && revisionSubmittedId === selectedOrderId;
  
  // Profile form state
  const [profileName, setProfileName] = useState(user?.full_name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (user && !profileName) setProfileName(user.full_name);
  }, [authLoading, user, router, profileName]);

  // Queries
  const { data: commissionStatus = { open: false } } = useQuery({
    queryKey: ['commission-status'],
    queryFn: getCommissionStatus,
  });

  const { data: orders = [], isLoading: loadingOrders, refetch: refetchOrders } = useQuery({
    queryKey: ['client-orders'],
    queryFn: getOrders,
    enabled: !!user,
  });

  const { data: collection = [], isLoading: loadingCollection } = useQuery({
    queryKey: ['client-collection'],
    queryFn: getMyCollection,
    enabled: !!user,
  });

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['order-invoices', selectedOrderId],
    queryFn: () => getInvoices(selectedOrderId!),
    enabled: !!selectedOrderId,
  });
  const paymentVersion = invoices.map(invoice => `${invoice.id}:${invoice.is_paid}`).join('|');

  const { data: revisions = [] } = useQuery({
    queryKey: ['order-revisions', selectedOrderId],
    queryFn: () => getRevisions(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const { data: files = [], isLoading: loadingFiles } = useQuery({
    queryKey: ['order-files', selectedOrderId],
    queryFn: () => getFiles(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  // Mutations
  const submitRevisionMutation = useMutation({
    mutationFn: ({ orderId, feedback }: { orderId: number; feedback: string }) => requestRevision(orderId, feedback),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order-revisions', variables.orderId] });
      setRevisionDrafts(drafts => ({ ...drafts, [variables.orderId]: '' }));
      setRevisionSubmittedId(variables.orderId);
    },
  });

  const uploadSlipMutation = useMutation({
    mutationFn: ({ invoiceId, file }: { invoiceId: number; file: File }) => payInvoice(invoiceId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-invoices', selectedOrderId] });
    },
    onError: (error: any, variables) => {
      const detail = error.response?.data?.detail;
      setSlipError({ invoiceId: variables.invoiceId, message: typeof detail === 'string' ? detail : t('slipError') });
    },
    onSettled: () => setUploadingSlipId(null),
  });

  const { data: myRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['client-commission-requests'],
    queryFn: getMyCommissionRequests,
    enabled: !!user,
  });

  const withdrawMutation = useMutation({
    mutationFn: (requestId: number) => withdrawCommissionRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-commission-requests'] });
      alert(t('withdrawSuccess'));
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || t('withdrawError'));
    },
  });

  if (authLoading || !user) {
    return <div className="flex-1 flex items-center justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  const handleUploadSlip = (invoiceId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (uploadingSlipId !== null) return;
    if (file) {
      setSlipError(null);
      setUploadingSlipId(invoiceId);
      uploadSlipMutation.mutate({ invoiceId, file });
    }
  };

  const handleDownload = async (file: OrderFile) => {
    setDownloadError(null);
    try {
      await downloadOrderFile(selectedOrderId!, file.id, file.filename);
    } catch (error) {
      setDownloadError({ fileId: file.id, paymentVersion, message: await getDownloadErrorMessage(error, t('downloadError')) });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await updateMe({ full_name: profileName });
      await fetchUser(); // refresh user context
      alert(t('profileSaved'));
    } catch (err) {
      alert(t('profileError'));
    }
    setProfileSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (avatarUploading) return;
    if (file) {
      setAvatarUploading(true);
      try {
        await uploadAvatar(file);
        await fetchUser();
      } catch (err) {
        alert(t('avatarError'));
      }
      setAvatarUploading(false);
    }
  };

  const getStatusBadgeClass = (status: Order['status']) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'ACCEPTED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'SKETCHING': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'COLORING': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CANCELLED': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
    }
  };

  const statusLabel = (status: string) => t.has(`statuses.${status}`) ? t(`statuses.${status}`) : status;

  const steps = ['PENDING', 'ACCEPTED', 'SKETCHING', 'COLORING', 'COMPLETED'];
  const getStepIndex = (status: string) => steps.indexOf(status);

  return (
    <div data-page-surface className="flex-1 flex flex-col md:flex-row h-[calc(100vh-3.5rem)] overflow-hidden bg-white dark:bg-neutral-950">
      
      {/* 🧭 SIDEBAR NAVIGATION */}
      <div className="w-full md:w-60 lg:w-72 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/30 flex flex-col shrink-0 z-20">
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-black text-base">
                {user.full_name.charAt(0)}
              </div>
            )}
          </div>
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white truncate">{user.full_name}</h2>
            <p className="text-[10px] font-mono text-neutral-500 truncate">{user.email}</p>
          </div>
        </div>

        <div className="flex-1 p-3 flex flex-col gap-1.5 overflow-y-auto">
          <button
            onClick={() => navigateDashboard('commissions')}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'commissions' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
            }`}
          >
            <Briefcase className="w-4 h-4" /> {t('myCommissions')}
          </button>
          
          <button
            onClick={() => navigateDashboard('collection')}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'collection' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> {t('myCollection')}
          </button>

          <button
            onClick={() => navigateDashboard('profile')}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'profile' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
            }`}
          >
            <User className="w-4 h-4" /> {t('profileSettings')}
          </button>
        </div>
      </div>

      {/* 🖼️ MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-y-auto relative bg-neutral-100 dark:bg-neutral-950">
        
        {/* COMMISSIONS LIST (If no order is selected) */}
        {activeTab === 'commissions' && selectedOrderId === null && (
          <div className="p-5 md:p-8 max-w-5xl mx-auto w-full space-y-5">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">{t('activeCommissions')}</h1>
                <p className="text-xs text-neutral-500 mt-0.5">{t('trackProgress')}</p>
              </div>
              <button onClick={() => router.push('/')} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> {t('newRequest')}
              </button>
            </div>

            {/* 📋 Commission Proposals & Briefs */}
            {myRequests.length > 0 && (
              <div className="space-y-3 pb-4">
                <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
                  {t('proposals')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myRequests.map((req: CommissionRequest) => (
                    <div
                      key={req.id}
                      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex flex-col justify-between space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            {req.service_title || t('customService')}
                          </span>
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm mt-1">
                            {req.character_name}
                          </h4>
                          <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">{req.brief}</p>
                          {req.status === 'DECLINED' && req.decline_reason && <p className="mt-2 whitespace-pre-wrap text-xs text-red-500">{t('declineReason')}: {req.decline_reason}</p>}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            req.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                              : req.status === 'ACCEPTED'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                              : 'bg-red-500/10 text-red-500 border border-red-500/30'
                          }`}
                        >
                          {statusLabel(req.status)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          ฿{req.total_price?.toLocaleString()}
                        </span>

                        {req.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => withdrawMutation.mutate(req.id)}
                            disabled={withdrawMutation.isPending}
                            className="text-[11px] text-red-500 hover:text-red-600 font-bold cursor-pointer"
                          >
                            {t('withdraw')}
                          </button>
                        )}
                        {req.status === 'ACCEPTED' && req.order_id && (
                          <button
                            type="button"
                            onClick={() => navigateDashboard('commissions', req.order_id!)}
                            className="text-[11px] text-blue-500 hover:text-blue-600 font-bold cursor-pointer"
                          >
                            {t('viewOrder', { id: req.order_id! })}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingOrders ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-24 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl">
                <Briefcase className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
                <h3 className="font-bold text-lg text-neutral-800 dark:text-white">{t('noCommissions')}</h3>
                <p className="text-sm text-neutral-500 mt-1">{t('findArtist')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {orders.map(order => (
                  <button
                    key={order.id}
                    onClick={() => navigateDashboard('commissions', order.id)}
                    className="text-left bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl hover:border-blue-500 transition-colors shadow-sm hover:shadow-md flex flex-col gap-3 group"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="font-black text-neutral-900 dark:text-white text-lg truncate group-hover:text-blue-500 transition-colors">{order.title}</h3>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadgeClass(order.status)} shrink-0`}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-blue-500 block mb-1">{t('artistLabel', { name: order.artist_name || t('unknownArtist') })}</span>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">{order.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-500 mt-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {parseApiDate(order.created_at).toLocaleDateString()}</span>
                      {order.agreed_price ? <span className="font-bold text-neutral-900 dark:text-white">฿{order.agreed_price}</span> : <span className="italic">{t('quotePending')}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LOADING ORDER STATE */}
        {activeTab === 'commissions' && selectedOrderId !== null && loadingOrders && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm text-neutral-400">{t('loadingDetails')}</p>
          </div>
        )}

        {/* ORDER NOT FOUND STATE */}
        {activeTab === 'commissions' && selectedOrderId !== null && !loadingOrders && !selectedOrder && (
          <div className="p-6 md:p-10 max-w-md mx-auto text-center space-y-4 my-auto">
            <AlertCircle className="w-12 h-12 text-neutral-500 mx-auto" />
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{t('orderNotFound')}</h2>
            <p className="text-sm text-neutral-500">{t('orderNotFoundDescription', { id: selectedOrderId })}</p>
            <button
              onClick={() => navigateDashboard('commissions')}
              className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {t('backToCommissions')}
            </button>
          </div>
        )}

        {/* ORDER DETAILS PANEL */}
        {activeTab === 'commissions' && selectedOrderId !== null && selectedOrder && (
          <div className="flex-1 flex flex-col overflow-y-auto bg-white dark:bg-neutral-950">
            <div className="p-4 sm:p-8 max-w-4xl w-full mx-auto space-y-6 sm:space-y-8 animate-fade-in-up">
              <button onClick={() => navigateDashboard('commissions')} className="text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-xl transition-colors w-fit">
                <ArrowLeft className="w-4 h-4 text-blue-500" /> {t('backToCommissions')}
              </button>

              <div className="flex flex-col md:flex-row justify-between gap-4 bg-neutral-50 dark:bg-neutral-900/30 p-6 sm:p-8 rounded-[2rem] border border-neutral-200 dark:border-neutral-800">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white mb-2">{selectedOrder.title}</h1>
                  <p className="text-sm font-bold text-blue-500 mb-4">{t('artistLabel', { name: selectedOrder.artist_name || t('unknownArtist') })}</p>
                  <CommissionBriefView brief={selectedOrder.commission_brief} fallback={selectedOrder.description} />
                </div>
                <div className="flex flex-col gap-3 items-end min-w-[140px]">
                  <span className={`text-xs font-black px-4 py-1.5 rounded-full border w-fit ${getStatusBadgeClass(selectedOrder.status)}`}>{statusLabel(selectedOrder.status)}</span>
                  {selectedOrder.agreed_price ? (
                    <span className="text-2xl font-black text-neutral-900 dark:text-white">฿{selectedOrder.agreed_price}</span>
                  ) : (
                    <span className="text-sm italic text-neutral-500">{t('quotePending')}</span>
                  )}
                </div>
              </div>

              {selectedOrder.status !== 'CANCELLED' && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t('workflowProgress')}</h3>
                  <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl">
                    <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 relative z-10 flex-wrap md:flex-nowrap gap-4">
                      {steps.map((step, idx) => {
                        const active = getStepIndex(selectedOrder.status) >= idx;
                        return (
                          <div key={step} className="flex flex-col items-center text-center flex-1 min-w-[70px]">
                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold mb-3 transition-all ${
                              active ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400'
                            }`}>
                              {idx + 1}
                            </div>
                            <span className={`text-[10px] uppercase tracking-wider ${active ? 'text-neutral-900 dark:text-white font-black' : 'text-neutral-400 font-bold'}`}>{statusLabel(step)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Invoices Section */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t('financialMilestones')}</h3>
                {loadingInvoices ? (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                ) : invoices.length === 0 ? (
                  <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 text-center text-neutral-500 text-sm font-bold">{t('noMilestones')}</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 flex flex-col justify-between gap-6 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-neutral-900 dark:text-white text-base">{localizedInvoiceTitle(inv.title,locale)}</h4>
                            <span className="text-neutral-500 text-[10px] font-mono mt-1 block">{t('created')} {parseApiDate(inv.created_at).toLocaleDateString()}</span>
                          </div>
                          <span className="text-xl font-black text-blue-500">฿{inv.amount}</span>
                        </div>
                        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                          {inv.is_paid ? (
                            <span className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-black bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/20 w-full">
                              <CheckCircle className="w-4 h-4" /> {t('paymentConfirmed')}
                            </span>
                          ) : selectedOrder.status === 'CANCELLED' ? (
                            <p className="text-sm text-neutral-500">{t('cancelledPaymentUnavailable')}</p>
                          ) : inv.slip_image_url ? (
                            <span className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-black bg-amber-50 dark:bg-amber-500/10 px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-500/20 w-full">
                              <FileCheck className="w-4 h-4" /> {t('slipUnderReview')}
                            </span>
                          ) : (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs text-red-500 font-black flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {t('unpaid')}</span>
                              <label className="flex flex-1 justify-center items-center gap-1.5 bg-neutral-900 dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md">
                                {uploadingSlipId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {t('uploadSlip')}
                                <input type="file" aria-label={t('uploadSlip')} accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => handleUploadSlip(inv.id, e)} disabled={uploadingSlipId !== null} className="sr-only" />
                              </label>
                            </div>
                          )}
                          {!inv.is_paid && selectedOrder.status !== 'CANCELLED' && <PromptPayButton key={inv.id} invoiceId={inv.id} onUploaded={() => {void queryClient.invalidateQueries({queryKey: ['order-invoices', selectedOrderId]});}} />}
                          {!inv.is_paid && selectedOrder.status !== 'CANCELLED' && inv.slip_image_url && (
                            <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border p-2 text-sm">
                              {t('replaceSlip')}
                              <input type="file" aria-label={t('replaceSlip')} accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => handleUploadSlip(inv.id, e)} disabled={uploadingSlipId !== null} className="sr-only" />
                            </label>
                          )}
                          {!inv.is_paid && slipError?.invoiceId === inv.id && <p role="alert" className="mt-3 text-sm text-red-500">{slipError.message}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Files Section */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t('deliverables')}</h3>
                {loadingFiles ? (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                ) : files.length === 0 ? (
                  <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 text-center text-neutral-500 text-sm font-bold">{t('noUploadedFiles')}</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {files.map((file) => (
                      <div key={file.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col group shadow-sm">
                        {file.filename.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                          <div className="aspect-square w-full relative bg-neutral-100 dark:bg-neutral-950 overflow-hidden">
                            <SecureImage key={`${file.id}-${file.is_watermarked}`} src={`/orders/${selectedOrderId}/files/${file.id}/download`} alt={file.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            {file.is_watermarked && (
                              <div className="absolute inset-0 bg-black/60 flex flex-col justify-center items-center p-4">
                                <Lock className="w-8 h-8 text-white/50 mb-2" />
                                <span className="text-[10px] font-black text-white bg-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">{t('watermarkLabel')}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="aspect-square w-full bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center text-neutral-400">
                            <FileText className="w-12 h-12 mb-2" />
                            <span className="text-[10px] font-mono px-4 text-center truncate w-full">{file.filename}</span>
                          </div>
                        )}
                        <div className="p-4 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
                          <div>
                            <span className="text-[9px] font-black bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded uppercase tracking-widest mb-1 inline-block">{file.file_type}</span>
                          </div>
                          <button aria-label={`${t('download')} ${file.filename}`} onClick={() => handleDownload(file)} className="p-2 bg-white dark:bg-neutral-950 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-neutral-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 rounded-lg border border-neutral-200 dark:border-neutral-800 transition-colors shadow-sm">
                            <ArrowDownToLine className="w-4 h-4" />
                          </button>
                        </div>
                        {downloadError?.fileId === file.id && downloadError.paymentVersion === paymentVersion && <p role="alert" className="p-3 text-sm text-red-500">{downloadError.message}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <section className="space-y-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
                <h3 className="font-bold">{t('revisionsFeedbacks')}</h3>
                <p className="text-sm">{t('remainingQuota')} {Math.max(0, selectedOrder.revision_quota - revisions.length)} / {selectedOrder.revision_quota}</p>
                {revisions.map(revision => (
                  <div key={revision.id} className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900">
                    <p className="whitespace-pre-wrap text-sm">{revision.client_feedback}</p>
                    <p className="mt-2 text-xs">{revision.is_addressed ? t('resolved') : t('awaitingAddress')}</p>
                  </div>
                ))}
                {['SKETCHING', 'COLORING'].includes(selectedOrder.status) && revisions.length < selectedOrder.revision_quota ? (
                  <form className="space-y-3" onSubmit={event => { event.preventDefault(); if (revisionFeedback.trim() && !submitRevisionMutation.isPending) submitRevisionMutation.mutate({ orderId: selectedOrder.id, feedback: revisionFeedback.trim() }); }}>
                    <label className="block text-sm font-bold" htmlFor="revision-feedback">{t('submitRevision')}</label>
                    <textarea id="revision-feedback" maxLength={2000} required value={revisionFeedback} onChange={event => { setRevisionFeedback(event.target.value); setRevisionSubmittedId(null); submitRevisionMutation.reset(); }} className="w-full rounded-xl border border-neutral-300 bg-transparent p-3 dark:border-neutral-700" />
                    <button type="submit" disabled={!revisionFeedback.trim() || submitRevisionMutation.isPending} className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{submitRevisionMutation.isPending ? t('submitting') : t('submitBtn')}</button>
                  </form>
                ) : <p className="text-sm text-neutral-500">{revisions.length >= selectedOrder.revision_quota ? t('revisionQuotaExhausted') : t('revisionStageUnavailable')}</p>}
                {submitRevisionMutation.isError && submitRevisionMutation.variables?.orderId === selectedOrder.id && <p role="alert" className="text-sm text-red-500">{t('revisionError')}</p>}
                {revisionSubmitted && <p role="status" className="text-sm text-emerald-600">{t('revisionSaved')}</p>}
              </section>

              {/* Messages */}
              <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t('communication')}</h3>
                <ChatBox orderId={selectedOrder.id} currentUserId={user.id} />
              </div>

            </div>
          </div>
        )}

        {/* 🎨 MY COLLECTION TAB */}
        {activeTab === 'collection' && (
          <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
            <div className="text-center py-10">
              <h1 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">{t('myCollection')}</h1>
              <p className="text-neutral-500 font-medium">{t('collectionDescription')}</p>
            </div>

            {loadingCollection ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>
            ) : collection.length === 0 ? (
              <div className="text-center py-24 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[2rem] shadow-sm max-w-2xl mx-auto">
                <ImageIcon className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
                <h3 className="font-black text-xl text-neutral-800 dark:text-white mb-2">{t('emptyCollection')}</h3>
                <p className="text-sm text-neutral-500">{t('emptyCollectionDescription')}</p>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                {collection.map((item: any) => (
                  <div key={item.id} className="break-inside-avoid relative group rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md">
                    {item.filename && !/\.(jpeg|jpg|gif|png|webp)$/i.test(item.filename) ? (
                      <div className="flex aspect-[4/3] flex-col gap-3 items-center justify-center p-6 text-neutral-600 dark:text-neutral-300"><FileText aria-hidden="true" className="h-10 w-10 shrink-0" /><span className="max-w-full break-all text-center text-sm">{item.filename}</span></div>
                    ) : /^\/(api\/)?(orders|auctions)\//.test(item.image_url) ? (
                      <SecureImage src={item.image_url} alt={item.title} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <img src={item.image_url.startsWith('http') ? item.image_url : (item.image_url.startsWith('/') ? item.image_url : `/${item.image_url}`)} alt={item.title} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
                    )}
                    <div className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-950 flex flex-col gap-1 p-5">
                      <h4 className="text-lg font-black text-white mb-1 break-words">{item.title}</h4>
                      <div className="flex items-center justify-between text-xs font-bold text-white/80">
                        <span>{t('byArtist', { name: item.artist_name })}</span>
                        <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">{item.type === 'Commission' ? t('collectionCommission') : t('collectionAuction')}</span>
                      </div>
                      {item.order_id && <button onClick={() => navigateDashboard('commissions', item.order_id)} className="mt-3 rounded-lg bg-blue-600 p-2 text-sm text-white">{t('viewOrder', { id: item.order_id })}</button>}
                      {!item.order_id && item.auction_id && <button onClick={() => router.push(`/auctions/${item.auction_id}`)} className="mt-3 rounded-lg bg-blue-600 p-2 text-sm text-white">{t('viewAuction')}</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ⚙️ PROFILE SETTINGS TAB */}
        {activeTab === 'profile' && (
          <div className="p-6 md:p-10 max-w-2xl mx-auto w-full space-y-8 animate-fade-in-up">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">{t('profileSettings')}</h1>
              <p className="text-sm text-neutral-500">{t('profileDescription')}</p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 shadow-sm">
              <form onSubmit={handleProfileUpdate} className="space-y-8">
                
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative group rounded-full focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-4">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-neutral-100 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-800 shadow-xl">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-black text-neutral-400 group-hover:opacity-50 transition-opacity">
                          {user.full_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 cursor-pointer transition-opacity z-10">
                      {avatarUploading ? <Loader2 className="w-8 h-8 animate-spin text-white" /> : <Camera className="w-8 h-8 text-white drop-shadow-lg" />}
                      <input type="file" aria-label={t('profilePicture')} accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} disabled={avatarUploading} className="sr-only" />
                    </label>
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-neutral-900 dark:text-white">{t('profilePicture')}</h3>
                    <p className="text-xs text-neutral-500 mt-1 max-w-xs">{t('avatarInstructions')}</p>
                  </div>
                </div>

                <div className="h-px bg-neutral-200 dark:bg-neutral-800 w-full" />

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-widest mb-2">{t('displayName')}</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-neutral-600 dark:text-neutral-400 uppercase tracking-widest mb-2">{t('readOnlyEmail')}</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 rounded-xl px-4 py-3 font-medium cursor-not-allowed opacity-70"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={profileSaving || !profileName.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25"
                  >
                    {profileSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {t('saveChanges')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ClientDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <ClientDashboardContent />
    </Suspense>
  );
}

