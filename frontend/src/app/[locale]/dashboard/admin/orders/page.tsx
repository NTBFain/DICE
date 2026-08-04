'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrders,
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

export default function OrdersAdminModule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

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

  // Active Workspace Tab state
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'brief' | 'finances' | 'chat'>('brief');

  // Orders query
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const activeOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  // Invoices query
  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices', activeOrder?.id],
    queryFn: () => getInvoices(activeOrder!.id),
    enabled: !!activeOrder?.id,
  });

  // Revisions query
  const { data: revisions = [], refetch: refetchRevisions } = useQuery({
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
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: ({ orderId, title, amount }: { orderId: number; title: string; amount: number }) =>
      createInvoice(orderId, { title, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', activeOrder?.id] });
      setInvoiceTitle('');
      setInvoiceAmount('');
    },
  });

  const approveInvoiceMutation = useMutation({
    mutationFn: (invoiceId: number) => approveInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', activeOrder?.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const resolveRevisionMutation = useMutation({
    mutationFn: (revisionId: number) => resolveRevision(revisionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisions', activeOrder?.id] });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: ({ orderId, file, type }: { orderId: number; file: File; type: 'WIP' | 'FINAL' | 'REFERENCE' }) =>
      uploadOrderFile(orderId, type, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', activeOrder?.id] });
      setUploadFile(null);
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: ({ orderId, fileId }: { orderId: number; fileId: number }) => deleteOrderFile(orderId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', activeOrder?.id] });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: { title: string; client_name?: string; description?: string }) =>
      createOrder({ title: data.title, description: data.description || '', artist_id: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowAddOrderModal(false);
      setNewOrderTitle('');
      setNewOrderClient('');
      setNewOrderDesc('');
    },
  });

  const handleUpdateStatus = (newStatus: string) => {
    if (!activeOrder) return;
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
        <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Loading Commission Queue...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls & Ticket Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl shadow-xs">
        <div>
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest">Studio Atelier Desk</span>
          <h2 className="text-2xl font-extrabold text-white">Commissions Queue & Brief Workspace</h2>
          <p className="text-xs text-neutral-400 mt-1">Manage client briefs, milestone invoices, WIP files, and revisions.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchOrders()}
            className="p-2.5 rounded-2xl bg-neutral-950 hover:bg-neutral-800 text-white border border-neutral-800 cursor-pointer transition-colors"
            title="Refresh Orders List"
          >
            <RefreshCw className="w-4 h-4 text-neutral-400" />
          </button>

          <button
            onClick={() => setShowAddOrderModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" /> Manual Ticket
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-24 bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
          <Briefcase className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Commission Briefs in Queue</h3>
          <p className="text-xs text-neutral-400 mt-1">Create a manual brief ticket or wait for client submissions.</p>
        </div>
      ) : (
        /* Workspace Main Split: Left Brief Tickets Queue (4 cols), Right Active Brief Inspector (8 cols) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Panel: Brief Ticket Queue Cards */}
          <div className="lg:col-span-4 space-y-3 max-h-[80vh] overflow-y-auto pr-1 no-scrollbar">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 px-1 block">
              Active Tickets ({orders.length})
            </span>

            {orders.map((ord) => {
              const isSelected = activeOrder?.id === ord.id;
              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrderId(ord.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-neutral-900 border-blue-500 shadow-md'
                      : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-blue-400 text-[10px]">TICKET #{ord.id}</span>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-neutral-950 text-neutral-300 border border-neutral-800">
                      {ord.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-white truncate">{ord.title}</h3>
                  <p className="text-[11px] text-neutral-400 truncate">Client: {ord.client_name || 'Guest Client'}</p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-2 border-t border-neutral-800">
                    <span>Agreed Price: <strong className="text-white">฿{ord.agreed_price || 0}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Panel: Detailed Brief Ticket Workspace */}
          {activeOrder && (
            <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6 shadow-xs">
              
              {/* Brief Ticket Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-neutral-950 text-blue-400 border border-neutral-800 px-2.5 py-0.5 rounded-md">
                      TICKET #{activeOrder.id}
                    </span>
                    <span className="text-xs font-bold text-neutral-400">Status: <strong className="text-white">{activeOrder.status}</strong></span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white mt-1">{activeOrder.title}</h2>
                </div>

                {/* Status Switcher Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">Update Stage:</span>
                  <select
                    value={activeOrder.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="SKETCH">SKETCH WIP</option>
                    <option value="LINEART">LINEART WIP</option>
                    <option value="COLORING">COLORING WIP</option>
                    <option value="FINAL_REVIEW">FINAL REVIEW</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>

              {/* Navigation Tabs for Workspace */}
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                <button
                  onClick={() => setActiveWorkspaceTab('brief')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeWorkspaceTab === 'brief'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" /> Brief & Assets ({files.length})
                </button>

                <button
                  onClick={() => setActiveWorkspaceTab('finances')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeWorkspaceTab === 'finances'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" /> Financial Milestones ({invoices.length})
                </button>

                <button
                  onClick={() => setActiveWorkspaceTab('chat')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeWorkspaceTab === 'chat'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Client Chat
                </button>
              </div>

              {/* TAB 1: BRIEF DETAILS & FILES WORKSPACE */}
              {activeWorkspaceTab === 'brief' && (
                <div className="space-y-6">
                  {/* Brief Overview Box */}
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">Client Brief Instructions</span>
                    <p className="text-xs text-white whitespace-pre-line leading-relaxed">
                      {activeOrder.description || 'No specific description supplied by client.'}
                    </p>
                  </div>

                  {/* Pricing Overview & Set Agreed Price */}
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">Agreed Total Price</span>
                      <strong className="text-lg text-white">฿{activeOrder.agreed_price || 0}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Agreed price (฿)"
                        value={agreedPriceInput}
                        onChange={(e) => setAgreedPriceInput(e.target.value)}
                        className="w-36 bg-neutral-900 border border-neutral-800 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={handleSetAgreedPrice}
                        disabled={updateOrderMutation.isPending}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Set Price
                      </button>
                    </div>
                  </div>

                  {/* File Deliverables Workspace Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Order Files & Deliverables</span>
                    </div>

                    {/* Upload File Form */}
                    <form onSubmit={handleFileUploadSubmit} className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <select
                          value={uploadFileType}
                          onChange={(e) => setUploadFileType(e.target.value as 'WIP' | 'FINAL' | 'REFERENCE')}
                          className="sm:col-span-4 bg-neutral-900 border border-neutral-800 text-white text-xs rounded-xl p-2 focus:outline-none focus:border-blue-500"
                        >
                          <option value="WIP">WIP Draft (Auto-Watermarked)</option>
                          <option value="FINAL">FINAL Artwork (High Res)</option>
                          <option value="REFERENCE">Reference Sheet</option>
                        </select>

                        <input
                          type="file"
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
                          Upload
                        </button>
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
                              {file.file_type}
                            </span>
                            <span className="text-white font-bold truncate">{file.filename}</span>
                          </div>

                          <button
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
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 block">Issue New Invoice Milestone</span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <input
                        type="text"
                        placeholder="Milestone Title (e.g. 50% Deposit)"
                        required
                        value={invoiceTitle}
                        onChange={(e) => setInvoiceTitle(e.target.value)}
                        className="sm:col-span-6 bg-neutral-900 border border-neutral-800 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Amount (฿)"
                        required
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        className="sm:col-span-3 bg-neutral-900 border border-neutral-800 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={createInvoiceMutation.isPending}
                        className="sm:col-span-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Receipt className="w-4 h-4" /> Issue Invoice
                      </button>
                    </div>
                  </form>

                  {/* Invoices List */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">Issued Invoices</span>
                    {invoices.map((inv) => (
                      <div key={inv.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <h4 className="font-extrabold text-white">{inv.title}</h4>
                          <span className="text-neutral-400 font-mono">฿{inv.amount}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase ${
                            inv.is_paid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {inv.is_paid ? 'PAID' : 'UNPAID'}
                          </span>

                          {!inv.is_paid && (
                            <button
                              onClick={() => approveInvoiceMutation.mutate(inv.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                              Approve Payment
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-white">
            <button
              onClick={() => setShowAddOrderModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-white">Create Manual Brief Ticket</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createOrderMutation.mutate({
                  title: newOrderTitle,
                  client_name: newOrderClient,
                  description: newOrderDesc,
                });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VTuber Full Body Model Commission"
                  value={newOrderTitle}
                  onChange={(e) => setNewOrderTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. @ClientTwitterHandle"
                  value={newOrderClient}
                  onChange={(e) => setNewOrderClient(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 font-bold uppercase block mb-1">Brief Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief details..."
                  value={newOrderDesc}
                  onChange={(e) => setNewOrderDesc(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={createOrderMutation.isPending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl transition-all shadow-xs cursor-pointer mt-2"
              >
                Create Brief Ticket
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
