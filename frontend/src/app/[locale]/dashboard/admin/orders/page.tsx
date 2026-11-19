'use client';

import { StudioOverlay } from '@/components/StudioDialog';

import StudioDialog from '@/components/StudioDialog';
import SecureReference from '@/components/SecureReference';
import CommissionBriefView from '@/components/commission/CommissionBriefView';
import { useLocale, useTranslations } from 'next-intl';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrders,
  getArtists,
  getMyArtistProfile,
  createOrder,
  updateOrder,
  getInvoices,
  createInvoice,
  approveInvoice,
  getRevisions,
  resolveRevision,
  getFiles,
  uploadOrderFile,
  deleteOrderFile,
} from '@/lib/api';
import { useAuth } from '@/components/AuthContext';
import ChatBox from '@/components/ChatBox';
import { getErrorMessage } from '@/lib/errorMessage';
import { invoiceTitle as localizedInvoiceTitle } from '@/lib/invoiceTitle';
import {
  Loader2,
  Upload,
  Trash2,
  Plus,
  RefreshCw,
  X,
  Briefcase,
  Clock,
  DollarSign,
  CheckCircle,
  Receipt,
  MessageSquare,
} from 'lucide-react';

const ORDER_STAGES = ['PENDING', 'ACCEPTED', 'SKETCHING', 'COLORING', 'COMPLETED', 'CANCELLED'];
const NEXT_STAGES: Record<string, string[]> = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['SKETCHING', 'CANCELLED'],
  SKETCHING: ['COLORING', 'CANCELLED'],
  COLORING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function OrdersAdminModuleContent() {
  const locale = useLocale();
  const w = useTranslations('OrderWorkspace');
  const stageText = useTranslations('ClientDashboard.statuses');
  const revisionText = useTranslations('OrderWorkspaceRevisions');
  const workspaceText = useTranslations('OrderWorkspaceNavigation');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const selectedOrderValue = searchParams.get('order');
  const parsedOrderId = selectedOrderValue && /^[1-9]\d*$/.test(selectedOrderValue) ? Number(selectedOrderValue) : null;
  const selectedOrderId = Number.isSafeInteger(parsedOrderId) ? parsedOrderId : null;
  const workspaceParam = searchParams.get('workspace');
  const activeWorkspaceTab = workspaceParam === 'finances' || workspaceParam === 'chat' || workspaceParam === 'revisions' ? workspaceParam : 'brief';
  const updateWorkspaceUrl = (key: 'order' | 'workspace', value: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (value === null) params.delete(key); else params.set(key, value);
    const query = params.toString();
    const destination = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    if (destination !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.pushState(null, '', destination);
  };
  const selectOrder = (id: number | null) => updateWorkspaceUrl('order', id === null ? null : String(id));
  const setActiveWorkspaceTab = (tab: 'brief' | 'finances' | 'chat' | 'revisions') => updateWorkspaceUrl('workspace', tab === 'brief' ? null : tab);

  // Invoice creation state
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');

  // File upload state
  const [uploadFileType, setUploadFileType] = useState<'WIP' | 'FINAL' | 'REFERENCE'>('WIP');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Pricing state
  const [agreedPriceInput, setAgreedPriceInput] = useState('');

  // Manual Quick Add Order Modal
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);
  const [newOrderTitle, setNewOrderTitle] = useState('');
  const [newOrderClient, setNewOrderClient] = useState('');
  const [newOrderDesc, setNewOrderDesc] = useState('');
  const [newOrderArtist, setNewOrderArtist] = useState('');
  const [actionError, setActionError] = useState('');

  // Active Workspace Tab state

  const { data: ownProfile } = useQuery({
    queryKey: ['my-artist-profile', user?.id],
    queryFn: getMyArtistProfile,
    enabled: !!user?.is_artist && !user?.is_admin,
  });
  const { data: availableArtists = [] } = useQuery({
    queryKey: ['manual-ticket-artists'],
    queryFn: getArtists,
    enabled: !!user?.is_admin,
  });
  const ticketArtistId = user?.is_admin ? Number(newOrderArtist) : ownProfile?.id;

  // Orders query
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const activeOrder = selectedOrderValue === null ? orders[0] : orders.find(order => order.id === selectedOrderId);

  // Invoices query
  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices', activeOrder?.id],
    queryFn: () => getInvoices(activeOrder!.id),
    enabled: !!activeOrder?.id,
  });

  // Revisions query
  const { data: revisions = [], isLoading: revisionsLoading, isError: revisionsFailed, refetch: refetchRevisions } = useQuery({
    queryKey: ['revisions', activeOrder?.id],
    queryFn: () => getRevisions(activeOrder!.id),
    enabled: !!activeOrder?.id,
  });

  // Files query
  const { data: files = [], refetch: refetchFiles } = useQuery({
    queryKey: ['files', activeOrder?.id],
    queryFn: () => getFiles(activeOrder!.id),
    enabled: !!activeOrder?.id,
  });

  // Mutations
  const updateOrderMutation = useMutation({
    onMutate: () => setActionError(''),
    onError: (error) => setActionError(getErrorMessage(error, w('updateError'))),
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const createInvoiceMutation = useMutation({
    onMutate: () => setActionError(''),
    onError: (error) => setActionError(getErrorMessage(error, w('actionError'))),
    mutationFn: ({ orderId, title, amount }: { orderId: number; title: string; amount: number }) =>
      createInvoice(orderId, { title, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', activeOrder?.id] });
      setInvoiceTitle('');
      setInvoiceAmount('');
    },
  });

  const approveInvoiceMutation = useMutation({
    onMutate: () => setActionError(''),
    onError: (error) => setActionError(getErrorMessage(error, w('actionError'))),
    mutationFn: (invoiceId: number) => approveInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', activeOrder?.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const resolveRevisionMutation = useMutation({
    onMutate: () => setActionError(''),
    onError: (error) => setActionError(getErrorMessage(error, w('actionError'))),
    mutationFn: ({ revisionId }: { revisionId: number; orderId: number }) => resolveRevision(revisionId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['revisions', variables.orderId] });
    },
  });

  const uploadFileMutation = useMutation({
    onMutate: () => setActionError(''),
    onError: (error) => setActionError(getErrorMessage(error, w('actionError'))),
    mutationFn: ({ orderId, file, type }: { orderId: number; file: File; type: 'WIP' | 'FINAL' | 'REFERENCE' }) =>
      uploadOrderFile(orderId, type, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', activeOrder?.id] });
      setUploadFile(null);
    },
  });

  const deleteFileMutation = useMutation({
    onMutate: () => setActionError(''),
    onError: (error) => setActionError(getErrorMessage(error, w('actionError'))),
    mutationFn: ({ orderId, fileId }: { orderId: number; fileId: number }) => deleteOrderFile(orderId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', activeOrder?.id] });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: { title: string; client_email: string; description: string }) => {
      if (!ticketArtistId) throw new Error(w('chooseArtistError'));
      return createOrder({ title: data.title.trim(), description: data.description.trim(), artist_id: ticketArtistId, client_email: data.client_email.trim() });
    },
    onMutate: () => setActionError(''),
    onError: (error) => setActionError(getErrorMessage(error, w('ticketError'))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowAddOrderModal(false);
      setNewOrderTitle('');
      setNewOrderClient('');
      setNewOrderDesc('');
      setNewOrderArtist('');
    },
  });

  const handleUpdateStatus = (newStatus: string) => {
    if (!activeOrder || updateOrderMutation.isPending) return;
    updateOrderMutation.mutate({ id: activeOrder.id, data: { status: newStatus } });
  };

  const handleSetAgreedPrice = () => {
    if (!activeOrder || !agreedPriceInput) return;
    const price = parseFloat(agreedPriceInput);
    if (isNaN(price)) return;
    updateOrderMutation.mutate({ id: activeOrder.id, data: { agreed_price: price } });
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !invoiceTitle || !invoiceAmount) return;
    createInvoiceMutation.mutate({
      orderId: activeOrder.id,
      title: invoiceTitle,
      amount: parseFloat(invoiceAmount),
    });
  };

  const handleFileUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !uploadFile) return;
    uploadFileMutation.mutate({
      orderId: activeOrder.id,
      file: uploadFile,
      type: uploadFileType,
    });
  };

  if (ordersLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-neutral-900 border border-neutral-800 rounded-3xl">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">{w('loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{actionError}</p>}
      {/* Top Controls & Ticket Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl shadow-xs">
        <div>
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">{w('badge')}</span>
          <h2 className="text-2xl font-extrabold text-white">{w('heading')}</h2>
          <p className="text-xs text-neutral-400 mt-1">{w('intro')}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchOrders()}
            className="p-2.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white border border-neutral-800 cursor-pointer transition-colors"
            title={w('refresh')}
          >
            <RefreshCw className="w-4 h-4 text-neutral-400" />
          </button>

          <button
            onClick={() => setShowAddOrderModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" /> {' '}{w('manual')}{' '}</button>
        </div>
      </div>

      {orders.length === 0 && selectedOrderValue === null ? (
        <div className="text-center py-24 bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
          <Briefcase className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">{w('empty')}</h3>
          <p className="text-xs text-neutral-400 mt-1">{w('emptyHelp')}</p>
        </div>
      ) : (
        /* Workspace Main Split: Left Brief Tickets Queue (4 cols), Right Active Brief Inspector (8 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Brief Ticket Queue Cards */}
          <div className="lg:col-span-4 space-y-3 max-h-[80vh] overflow-y-auto pr-1 no-scrollbar">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 px-1 block">
              {' '}{w('activePrefix')}{orders.length})
            </span>

            {orders.map((ord) => {
              const isSelected = activeOrder?.id === ord.id;
              return (
                <button type="button"
                  key={ord.id}
                  aria-pressed={isSelected}
                  aria-label={workspaceText('openTicket', { id: ord.id, title: ord.title })}
                  onClick={() => selectOrder(ord.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-neutral-900 border-blue-500 shadow-md'
                      : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-blue-400 text-[10px]">{w('ticketPrefix')}{ord.id}</span>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-neutral-950 text-neutral-300 border border-neutral-800">
                      {stageText.has(ord.status) ? stageText(ord.status) : ord.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-white truncate">{ord.title}</h3>
                  <p className="text-[11px] text-neutral-400 truncate">{w('clientPrefix')}{' '}{ord.client_name || w('guest')}</p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-2 border-t border-neutral-800">
                    <span>{w('pricePrefix')}{' '}<strong className="text-white">฿{ord.agreed_price || 0}</strong></span>
                  </div>
                </button>
              );
            })}
          </div>

          {!activeOrder && <section role="alert" className="lg:col-span-8 space-y-3 rounded-2xl border border-amber-700 bg-neutral-900 p-6">
            <h3 className="font-bold">{workspaceText('missingTitle')}</h3>
            <p className="break-words text-sm text-neutral-300">{workspaceText('missingDescription', { id: selectedOrderValue || '?' })}</p>
            <button type="button" onClick={() => selectOrder(null)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">{workspaceText('backToQueue')}</button>
          </section>}

          {/* Right Panel: Detailed Brief Ticket Workspace */}
          {activeOrder && (
            <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6 shadow-xs">
              
              {/* Brief Ticket Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-neutral-950 text-blue-400 border border-neutral-800 px-2.5 py-0.5 rounded-md">
                      {' '}{w('ticketPrefix')}{activeOrder.id}
                    </span>
                    <span className="text-xs font-bold text-neutral-400">{w('statusPrefix')}{' '}<strong className="text-white">{stageText.has(activeOrder.status) ? stageText(activeOrder.status) : activeOrder.status}</strong></span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white mt-1">{activeOrder.title}</h2>
                </div>

                {/* Status Switcher Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">{w('stagePrefix')}</span>
                  <select
                    aria-label={w('stageLabel')}
                    value={activeOrder.status}
                    disabled={updateOrderMutation.isPending || (!user?.is_admin && !(NEXT_STAGES[activeOrder.status]?.length))}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {ORDER_STAGES.filter((stage) => user?.is_admin || stage === activeOrder.status || NEXT_STAGES[activeOrder.status]?.includes(stage)).map((stage) => (
                      <option key={stage} value={stage}>{stageText(stage)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Navigation Tabs for Workspace */}
              <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3">
                <button
                  onClick={() => setActiveWorkspaceTab('brief')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeWorkspaceTab === 'brief'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" /> {' '}{w('briefPrefix')}{files.length})
                </button>

                <button
                  onClick={() => setActiveWorkspaceTab('finances')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeWorkspaceTab === 'finances'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" /> {' '}{w('financePrefix')}{invoices.length})
                </button>

                <button
                  onClick={() => setActiveWorkspaceTab('chat')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeWorkspaceTab === 'chat'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> {' '}{w('chat')}{' '}</button>
                <button type="button" aria-pressed={activeWorkspaceTab === 'revisions'}
                  onClick={() => setActiveWorkspaceTab('revisions')}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeWorkspaceTab === 'revisions' ? 'bg-blue-600 text-white' : 'border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'}`}>
                  <CheckCircle className="h-3.5 w-3.5" /> {revisionText('tab', { count: revisions.length })}
                </button>
              </div>

              {/* TAB 1: BRIEF DETAILS & FILES WORKSPACE */}
              {activeWorkspaceTab === 'brief' && (
                <div className="space-y-6">
                  {/* Brief Overview Box */}
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">{w('briefHeading')}</span>
                    <div className="text-xs text-white whitespace-pre-line leading-relaxed">
                      <CommissionBriefView brief={activeOrder.commission_brief} fallback={activeOrder.description || w('noDescription')} />
                    </div>
                  </div>

                  {/* Pricing Overview & Set Agreed Price */}
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">{w('agreedTotal')}</span>
                      <strong className="text-lg text-white">฿{activeOrder.agreed_price || 0}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number" step="0.01"
                        placeholder={w('agreedPrice')}
                        aria-label={w('agreedPrice')} value={agreedPriceInput}
                        onChange={(e) => setAgreedPriceInput(e.target.value)}
                        className="w-36 bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={handleSetAgreedPrice}
                        disabled={updateOrderMutation.isPending}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        {' '}{w('setPrice')}{' '}</button>
                    </div>
                  </div>

                  {/* File Deliverables Workspace Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{w('filesHeading')}</span>
                    </div>

                    {/* Upload File Form */}
                    <form onSubmit={handleFileUploadSubmit} className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <select
                          aria-label={w('fileType')} value={uploadFileType}
                          onChange={(e) => setUploadFileType(e.target.value as 'WIP' | 'FINAL' | 'REFERENCE')}
                          className="sm:col-span-4 bg-neutral-900 border border-neutral-800 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-blue-500"
                        >
                          <option value="WIP">{w('wipOption')}</option>
                          <option value="FINAL">{w('finalOption')}</option>
                          <option value="REFERENCE">{w('referenceOption')}</option>
                        </select>

                        <input
                          type="file" aria-label={w('uploadFile')}
                          required
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                          className="sm:col-span-6 bg-neutral-900 border border-neutral-800 text-white text-xs rounded-xl p-2 focus:outline-none"
                        />

                        <button
                          type="submit"
                          disabled={uploadFileMutation.isPending}
                          className="sm:col-span-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {uploadFileMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          {' '}{w('upload')}{' '}</button>
                      </div>
                    </form>

                    {/* Deliverables Files List */}
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div key={file.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5 truncate">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                              file.file_type === 'FINAL' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}>
                              {w.has(`file${file.file_type}`) ? w(`file${file.file_type}`) : file.file_type}
                            </span>
                            <span className="text-white font-bold truncate">{file.filename}</span>
                          </div>

                          <button aria-label={w('delete')}
                            onClick={() => deleteFileMutation.mutate({ orderId: activeOrder.id, fileId: file.id })}
                            className="p-1.5 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FINANCIAL MILESTONES WORKSPACE */}
              {activeWorkspaceTab === 'finances' && (
                <div className="space-y-6">
                  {/* Create Invoice Milestone Form */}
                  <form onSubmit={handleCreateInvoiceSubmit} className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">{w('issueHeading')}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <input
                        type="text"
                        placeholder={w('invoiceTitle')}
                        required
                        aria-label={w('invoiceTitle')} value={invoiceTitle}
                        onChange={(e) => setInvoiceTitle(e.target.value)}
                        className="sm:col-span-6 bg-neutral-900 border border-neutral-800 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="number" step="0.01"
                        placeholder={w('invoiceAmount')}
                        required
                        aria-label={w('invoiceAmount')} value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        className="sm:col-span-3 bg-neutral-900 border border-neutral-800 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={createInvoiceMutation.isPending}
                        className="sm:col-span-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Receipt className="w-4 h-4" /> {' '}{w('issue')}{' '}</button>
                    </div>
                  </form>

                  {/* Invoices List */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">{w('invoicesHeading')}</span>
                    {invoices.map((inv) => (
                      <div key={inv.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-wrap gap-4 items-center justify-between text-xs">
                        <div>
                          <h4 className="font-extrabold text-white">{localizedInvoiceTitle(inv.title,locale)}</h4>
                          <span className="text-neutral-400 font-mono">฿{inv.amount}</span>
                          {inv.slip_image_url && (
                            <div className="mt-3 w-28">
                              <span className="mb-1 block text-neutral-300">{locale === 'th' ? 'หลักฐานการชำระเงิน' : 'Payment slip'}</span>
                              <SecureReference src={`/invoices/${inv.id}/slip`} title={localizedInvoiceTitle(inv.title,locale)}
                                openLabel={locale === 'th' ? 'ดูหลักฐานการชำระเงิน' : 'View payment slip'} />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase ${
                            inv.is_paid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {inv.is_paid ? w(inv.payment_mode === 'provider' ? 'stripePaid' : 'paid') : w('unpaid')}
                          </span>

                          {!inv.is_paid && (
                            <button
                              onClick={() => { if (!approveInvoiceMutation.isPending) approveInvoiceMutation.mutate(inv.id); }}
                              disabled={approveInvoiceMutation.isPending}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                              {' '}{w('approve')}{' '}</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeWorkspaceTab === 'revisions' && (
                <section className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4" aria-labelledby={`revision-heading-${activeOrder.id}`}>
                  <h3 id={`revision-heading-${activeOrder.id}`} className="font-bold">{revisionText('heading')}</h3>
                  <p className="text-xs text-neutral-400">{revisionText('quota', { used: revisions.length, quota: activeOrder.revision_quota })}</p>
                  {revisionsLoading ? <p role="status">{revisionText('loading')}</p> : revisionsFailed ? (
                    <div role="alert" className="space-y-2 text-sm text-red-300"><p>{revisionText('loadError')}</p><button type="button" className="underline" onClick={() => refetchRevisions()}>{revisionText('retry')}</button></div>
                  ) : revisions.length === 0 ? <p className="text-sm text-neutral-400">{revisionText('empty')}</p> : revisions.map(revision => (
                    <article key={revision.id} className="space-y-3 rounded-xl border border-neutral-800 p-4">
                      <p className="whitespace-pre-wrap break-words text-sm text-white">{revision.client_feedback}</p>
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className={revision.is_addressed ? 'text-emerald-400' : 'text-amber-300'}>{revision.is_addressed ? revisionText('resolved') : revisionText('pending')}</span>
                        {!revision.is_addressed && (user?.is_admin || activeOrder.artist_id === user?.id) && (
                          <button type="button" disabled={resolveRevisionMutation.isPending}
                            onClick={() => { if (!resolveRevisionMutation.isPending) resolveRevisionMutation.mutate({ revisionId: revision.id, orderId: activeOrder.id }); }}
                            className="flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 font-bold text-white disabled:opacity-50">
                            {resolveRevisionMutation.isPending && resolveRevisionMutation.variables?.revisionId === revision.id && <Loader2 className="h-3 w-3 animate-spin" />}
                            {revisionText('resolve')}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </section>
              )}

              {/* TAB 3: CLIENT CHAT WORKSPACE */}
              {activeWorkspaceTab === 'chat' && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl">
                  <ChatBox orderId={activeOrder.id} currentUserId={user?.id || 1} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Quick Add Order Modal */}
      {showAddOrderModal && (
        <StudioOverlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <StudioDialog label={w('dialogLabel')} onClose={() => setShowAddOrderModal(false)} className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-white">
            <button aria-label={w('close')}
              onClick={() => setShowAddOrderModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-white">{w('dialogTitle')}</h3>

            {actionError && <p role="alert" className="text-sm text-red-300">{actionError}</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createOrderMutation.mutate({
                  title: newOrderTitle,
                  client_email: newOrderClient,
                  description: newOrderDesc,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">{w('title')}</label>
                <input
                  type="text"
                  required
                  placeholder={w('titlePlaceholder')}
                  aria-label={w('title')} value={newOrderTitle}
                  onChange={(e) => setNewOrderTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1" htmlFor="manual-client-email">{w('clientEmail')}</label>
                <input
                  id="manual-client-email"
                  type="email"
                  required
                  placeholder="client@example.com"
                  value={newOrderClient}
                  onChange={(e) => setNewOrderClient(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              {user?.is_admin && <div>
                <label htmlFor="manual-ticket-artist" className="text-neutral-400 font-bold uppercase block mb-1">{w('artist')}</label>
                <select id="manual-ticket-artist" required value={newOrderArtist} onChange={(e) => setNewOrderArtist(e.target.value)} className="w-full rounded-xl bg-neutral-950 border border-neutral-800 p-2.5">
                  <option value="">{w('chooseArtist')}</option>
                  {availableArtists.map((artist) => <option key={artist.id} value={artist.id}>{artist.display_name} (@{artist.handle})</option>)}
                </select>
              </div>}

              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">{w('description')}</label>
                <textarea
                  rows={3}
                  placeholder={w('descriptionPlaceholder')}
                  required
                  maxLength={3000}
                  aria-label={w('description')} value={newOrderDesc}
                  onChange={(e) => setNewOrderDesc(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={createOrderMutation.isPending || !ticketArtistId}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl transition-all shadow-xs cursor-pointer mt-2"
              >
                {' '}{w('create')}{' '}</button>
            </form>
          </StudioDialog>
        </StudioOverlay>
      )}
    </div>
  );
}

export default function OrdersAdminModule() {
  const w = useTranslations('OrderWorkspace');
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-24 bg-neutral-900 border border-neutral-800 rounded-3xl">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
          <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">{w('loading')}</span>
        </div>
      }
    >
      <OrdersAdminModuleContent />
    </Suspense>
  );
}

