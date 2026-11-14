'use client';
import CommissionBriefView from '@/components/commission/CommissionBriefView';
import { usageText } from '@/lib/commissionBrief';
import { getCommissionOptionText } from '@/lib/commissionBlockText';
import { getErrorMessage } from '@/lib/errorMessage';


import { StudioOverlay } from '@/components/StudioDialog';

import { useLocale } from 'next-intl';
import { getCommissionBlockText } from '@/lib/commissionBlockText';

import { useTranslations } from 'next-intl';

import StudioDialog, { StudioFormDialog } from '@/components/StudioDialog';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthContext';
import {
  getIncomingCommissionRequests,
  acceptCommissionRequest,
  declineCommissionRequest,
  updateServiceAvailability,
  updateCommissionPolicy,
  addServiceAddon,
  deleteServiceAddon,
  getArtistCommissionInfo,
  createArtistService,
  deleteArtistService,
  updateServiceFormSchema,
  updateServiceScale,
} from '@/lib/commissionApi';
import { getMyArtistProfile } from '@/lib/api';
import {
  CommissionRequest,
  CommissionRequestStatus,
  CommissionPolicy,
  CommissionServiceDetail,
  ServiceAddon,
  FormBlock,
} from '@/types/commission';
import {
  Inbox,
  Sliders,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  ShieldAlert,
  Bell,
  Eye,
  Settings,
  Edit3,
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { ModularFormBuilderModal } from '@/components/commission/ModularFormBuilderModal';
import SecureReference from '@/components/SecureReference';
import { EditScaleModal } from '@/components/commission/EditScaleModal';

export default function ArtistCommissionsDashboard() {
  const locale = useLocale();
  const requestStatus = useTranslations('ClientDashboard.statuses');
  const studio = useTranslations('Studio');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hubMessage, setHubMessage] = useState('');
  const showHubMessage = (detail: unknown) => setHubMessage(getErrorMessage({response:{data:{detail}}}, locale === 'th' ? 'ดำเนินการไม่สำเร็จ โปรดลองอีกครั้ง' : 'The request could not be completed. Please try again.'));
  const [activeTab, setActiveTab] = useState<'inbox' | 'scales' | 'policy'>('inbox');
  const [inboxFilter, setInboxFilter] = useState<CommissionRequestStatus | 'ALL'>('ALL');

  // Modals state
  const [declineModalReq, setDeclineModalReq] = useState<CommissionRequest | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [detailModalReq, setDetailModalReq] = useState<CommissionRequest | null>(null);

  // Addon modal state
  const [newAddonServiceId, setNewAddonServiceId] = useState<number | null>(null);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonType, setNewAddonType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [newAddonPrice, setNewAddonPrice] = useState(200);

  // Policy form local state
  const [policyForm, setPolicyForm] = useState<Partial<CommissionPolicy> | null>(null);
  const [willDrawInput, setWillDrawInput] = useState('');
  const [wontDrawInput, setWontDrawInput] = useState('');

  // New Scale / Form modal state
  const [newScaleModalOpen, setNewScaleModalOpen] = useState(false);
  const [newScaleTitle, setNewScaleTitle] = useState('');
  const [newScaleCategory, setNewScaleCategory] = useState('Illustration');
  const [newScaleDescription, setNewScaleDescription] = useState('');
  const [newScaleBasePrice, setNewScaleBasePrice] = useState(500);
  const [newScaleEstimatedDays, setNewScaleEstimatedDays] = useState(7);
  const [newScaleMaxSlots, setNewScaleMaxSlots] = useState(3);
  const [newScaleIsOpen, setNewScaleIsOpen] = useState(true);
  const [editingFormSchemaService, setEditingFormSchemaService] = useState<CommissionServiceDetail | null>(null);
  const [editingScaleService, setEditingScaleService] = useState<CommissionServiceDetail | null>(null);

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam === 'scales' || tabParam === 'policy' || tabParam === 'inbox') {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  // 1. Fetch artist profile
  const { data: profile } = useQuery({
    queryKey: ['my-artist-profile'],
    queryFn: getMyArtistProfile,
  });

  // 2. Fetch full commission info (services, policy)
  const { data: commissionInfo, isLoading: loadingInfo } = useQuery({
    queryKey: ['artist-commission-info', profile?.handle],
    queryFn: () => getArtistCommissionInfo(profile!.handle),
    enabled: !!profile?.handle,
  });

  // 3. Fetch incoming requests
  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['artist-incoming-requests', inboxFilter],
    queryFn: () => getIncomingCommissionRequests(inboxFilter === 'ALL' ? undefined : inboxFilter),
  });

  // Mutations
  const acceptMutation = useMutation({
    mutationFn: (requestId: number) => acceptCommissionRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-incoming-requests'] });
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info'] });
      showHubMessage(studio('commissions_125_0'));
    },
    onError: (err: any) => {
      showHubMessage(err.response?.data?.detail || studio('commissions_128_0'));
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => declineCommissionRequest(declineModalReq!.id, declineReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-incoming-requests'] });
      setDeclineModalReq(null);
      setDeclineReason('');
      showHubMessage(studio('commissions_138_0'));
    },
    onError: (err: any) => {
      showHubMessage(err.response?.data?.detail || studio('commissions_141_0'));
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ serviceId, isFormOpen }: { serviceId: number; isFormOpen: boolean }) =>
      updateServiceAvailability(serviceId, isFormOpen, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info'] });
    },
    onError: (err: any) => {
      showHubMessage(err.response?.data?.detail || studio('commissions_152_0'));
    },
  });

  const savePolicyMutation = useMutation({
    mutationFn: (data: Partial<CommissionPolicy>) => updateCommissionPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info'] });
      showHubMessage(studio('commissions_160_0'));
    },
    onError: (err: any) => {
      showHubMessage(err.response?.data?.detail || studio('commissions_163_0'));
    },
  });

  const addAddonMutation = useMutation({
    mutationFn: () =>
      addServiceAddon(newAddonServiceId!, {
        name: newAddonName,
        price_type: newAddonType,
        price_value: Number(newAddonPrice),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info'] });
      setNewAddonServiceId(null);
      setNewAddonName('');
      setNewAddonPrice(200);
    },
  });

  const deleteAddonMutation = useMutation({
    mutationFn: ({ serviceId, addonId }: { serviceId: number; addonId: number }) =>
      deleteServiceAddon(serviceId, addonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info'] });
    },
  });

  const createScaleMutation = useMutation({
    mutationFn: () =>
      createArtistService({
        title: newScaleTitle.trim(),
        category: newScaleCategory.trim(),
        description: newScaleDescription.trim(),
        base_price: Number(newScaleBasePrice),
        estimated_days: Number(newScaleEstimatedDays),
        max_slots: Number(newScaleMaxSlots),
        is_form_open: newScaleIsOpen,
        auto_close_on_full: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info'] });
      setNewScaleModalOpen(false);
      setNewScaleTitle('');
      setNewScaleDescription('');
      setNewScaleBasePrice(500);
      setNewScaleEstimatedDays(7);
      setNewScaleMaxSlots(3);
      setNewScaleIsOpen(true);
      showHubMessage(studio('commissions_211_0'));
    },
    onError: (err: any) => {
      showHubMessage(err.response?.data?.detail || studio('commissions_214_0'));
    },
  });

  const deleteScaleMutation = useMutation({
    mutationFn: (serviceId: number) => deleteArtistService(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info'] });
    },
  });

  const saveFormSchemaMutation = useMutation({
    mutationFn: ({ serviceId, blocks }: { serviceId: number; blocks: FormBlock[] }) =>
      updateServiceFormSchema(serviceId, blocks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info'] });
      setEditingFormSchemaService(null);
      showHubMessage(studio('commissions_231_0'));
    },
    onError: (err: any) => {
      showHubMessage(err.response?.data?.detail || studio('commissions_234_0'));
    },
  });

  const updateScaleMutation = useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: number; data: Partial<CommissionServiceDetail> }) =>
      updateServiceScale(serviceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info'] });
      setEditingScaleService(null);
      showHubMessage(studio('commissions_244_0'));
    },
    onError: (err: any) => {
      showHubMessage(err.response?.data?.detail || studio('commissions_247_0'));
    },
  });

  // Sync policy to local state when fetched
  if (commissionInfo?.policy && !policyForm) {
    setPolicyForm({
      terms_of_service: commissionInfo.policy.terms_of_service || '',
      refund_policy: commissionInfo.policy.refund_policy || '',
      ai_policy: commissionInfo.policy.ai_policy || '',
      will_draw: commissionInfo.policy.will_draw || [],
      wont_draw: commissionInfo.policy.wont_draw || [],
      deposit_percent: commissionInfo.policy.deposit_percent || 50,
      default_revision_quota: commissionInfo.policy.default_revision_quota || 3,
    });
  }

  const handleAddWillDraw = () => {
    if (!willDrawInput.trim()) return;
    const current = policyForm?.will_draw || [];
    if (!current.includes(willDrawInput.trim())) {
      setPolicyForm({ ...policyForm, will_draw: [...current, willDrawInput.trim()] });
    }
    setWillDrawInput('');
  };

  const handleRemoveWillDraw = (tag: string) => {
    const current = policyForm?.will_draw || [];
    setPolicyForm({ ...policyForm, will_draw: current.filter((t) => t !== tag) });
  };

  const handleAddWontDraw = () => {
    if (!wontDrawInput.trim()) return;
    const current = policyForm?.wont_draw || [];
    if (!current.includes(wontDrawInput.trim())) {
      setPolicyForm({ ...policyForm, wont_draw: [...current, wontDrawInput.trim()] });
    }
    setWontDrawInput('');
  };

  const handleRemoveWontDraw = (tag: string) => {
    const current = policyForm?.wont_draw || [];
    setPolicyForm({ ...policyForm, wont_draw: current.filter((t) => t !== tag) });
  };

  return (
    <div className="space-y-6">
      {hubMessage && <div role="status" aria-live="polite" className="rounded-xl border border-blue-500/40 bg-blue-950 p-4 text-sm text-blue-100 flex items-start justify-between gap-3">
        <p className="whitespace-pre-wrap break-words">{hubMessage}</p>
        <button type="button" onClick={() => setHubMessage('')} aria-label={locale === 'th' ? 'ปิดข้อความ' : 'Dismiss message'} className="rounded px-2 focus-visible:outline focus-visible:outline-2">×</button>
      </div>}
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900/60 border border-neutral-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            VGen-Style Commission Hub
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {' '}{studio('commissions_302_0')}{' '}</p>
        </div>

        {profile && (
          <Link
            href={`/artists/${profile.handle}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-xl hover:bg-blue-500/20 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> {' '}{studio('commissions_312_0')}{' '}</Link>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'inbox'
              ? 'border-blue-500 text-white bg-blue-500/5'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Inbox className="w-4 h-4 text-blue-400" />
          {' '}{studio('commissions_328_0')}{' '}{requests.filter((r) => r.status === 'PENDING').length > 0 && (
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
              {requests.filter((r) => r.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('scales')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'scales'
              ? 'border-blue-500 text-white bg-blue-500/5'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-400" />
          {' '}{studio('commissions_345_0')}{' '}</button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'policy'
              ? 'border-blue-500 text-white bg-blue-500/5'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-400" />
          {' '}{studio('commissions_357_0')}{' '}</button>
      </div>

      {/* TAB 1: INBOX */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {(['ALL', 'PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setInboxFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  inboxFilter === st
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {st === 'ALL' ? studio('commissions_376_0') : requestStatus(st)}
              </button>
            ))}
          </div>

          {loadingRequests ? (
            <div className="p-12 text-center text-neutral-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
              {' '}{studio('commissions_384_0')}{' '}</div>
          ) : requests.length === 0 ? (
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400">
              <Inbox className="w-12 h-12 mx-auto text-neutral-600 mb-2" />
              <p className="text-sm font-bold">{studio('commissions_389_0')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4 hover:border-neutral-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {req.service_title || 'Commission Scale'}
                        </span>
                        <h3 className="text-base font-bold text-white mt-1">
                          {req.character_name}
                        </h3>
                        <p className="text-xs text-neutral-400">
                          {' '}{studio('commissions_408_0')}{' '}{req.client_name || req.client_email || 'Client'}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          req.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : req.status === 'ACCEPTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {requestStatus(req.status)}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 line-clamp-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800/60 whitespace-pre-wrap">
                      {req.brief}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                      <div>
                        <span className="text-neutral-500 block text-[10px]">{studio('commissions_431_0')}</span>
                        <span className="font-semibold text-neutral-200">{usageText(req.usage_type, locale)}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">{studio('commissions_435_0')}</span>
                        <span className="font-semibold text-neutral-200">{getCommissionOptionText(req.canvas_size, locale)}</span>
                      </div>
                    </div>

                    {req.addons_snapshot && req.addons_snapshot.length > 0 && (
                      <div className="text-[11px] bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/40">
                        <span className="text-neutral-400 block font-bold mb-1">{studio('commissions_442_0')}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {req.addons_snapshot.map((ad, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-md"
                            >
                              +{ad.name} ({ad.price_type === 'FIXED' ? `฿${ad.price_value}` : `${ad.price_value}%`})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-neutral-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">{studio('commissions_459_0')}</span>
                      <span className="text-lg font-bold text-emerald-400">
                        ฿{req.total_price.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDetailModalReq(req)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> {' '}{studio('commissions_470_0')}{' '}</button>

                      {req.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => acceptMutation.mutate(req.id)}
                            disabled={acceptMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> {' '}{studio('commissions_480_0')}{' '}</button>

                          <button
                            onClick={() => setDeclineModalReq(req)}
                            className="flex items-center justify-center p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl transition-colors cursor-pointer"
                            title={studio('commissions_486_0')}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCALES & SLOTS */}
      {activeTab === 'scales' && (
        <div className="space-y-4">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                {' '}{studio('commissions_509_0')}{' '}</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {' '}{studio('commissions_512_0')}{' '}</p>
            </div>
            <button
              onClick={() => setNewScaleModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" /> {' '}{studio('commissions_519_0')}{' '}</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {commissionInfo?.services.map((svc) => (
              <div
                key={svc.id}
                className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {svc.category}
                      </span>
                      <button
                        onClick={() => setEditingScaleService(svc)}
                        className="text-neutral-400 hover:text-blue-400 p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                        title={studio('commissions_538_0')}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`คุณต้องการลบสเกล "${svc.title}" ใช่หรือไม่?`)) {
                            deleteScaleMutation.mutate(svc.id);
                          }
                        }}
                        className="text-neutral-500 hover:text-red-400 transition-colors cursor-pointer p-1 rounded-lg hover:bg-neutral-800"
                        title={studio('commissions_549_0')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{svc.title}</h3>
                    <p className="text-xs text-neutral-400">{svc.description}</p>
                  </div>

                  {/* Toggle Form Open Switch */}
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      aria-pressed={svc.is_form_open}
                      aria-label={`${svc.is_form_open ? studio('commissions_578_2') : studio('commissions_578_1')}: ${svc.title}`}
                      disabled={toggleAvailabilityMutation.isPending}
                      onClick={() =>
                        toggleAvailabilityMutation.mutate({
                          serviceId: svc.id,
                          isFormOpen: !svc.is_form_open,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        svc.is_form_open ? 'bg-emerald-600' : 'bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          svc.is_form_open ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-[10px] font-bold text-neutral-400">
                      {svc.is_form_open ? studio('commissions_578_1') : studio('commissions_578_2')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800/60 text-center">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">{studio('commissions_585_0')}</span>
                    <span className="text-sm font-bold text-white">฿{svc.base_price.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">{studio('commissions_589_0')}</span>
                    <span className="text-sm font-bold text-white">{svc.estimated_days} {' '}{studio('commissions_590_0')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">{studio('commissions_593_0')}</span>
                    <span
                      className={`text-sm font-bold ${
                        svc.used_slots >= svc.max_slots ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {svc.used_slots} / {svc.max_slots} {' '}{studio('commissions_599_0')}{' '}</span>
                  </div>
                </div>

                {/* Add-ons List */}
                <div className="space-y-2 pt-2 border-t border-neutral-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300">{studio('commissions_607_0')}</span>
                    <button
                      onClick={() => setNewAddonServiceId(svc.id)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Plus className="w-3 h-3" /> {' '}{studio('commissions_612_0')}{' '}</button>
                  </div>

                  {svc.addons.length === 0 ? (
                    <p className="text-[11px] text-neutral-500 italic">{studio('commissions_617_0')}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {svc.addons.map((ad) => (
                        <div
                          key={ad.id}
                          className="flex items-center justify-between bg-neutral-950/80 px-3 py-1.5 rounded-lg border border-neutral-800/40 text-xs"
                        >
                          <span className="text-neutral-300">{ad.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-bold">
                              {ad.price_type === 'FIXED' ? `+฿${ad.price_value}` : `+${ad.price_value}%`}
                            </span>
                            <button
                              onClick={() =>
                                deleteAddonMutation.mutate({ serviceId: svc.id, addonId: ad.id })
                              }
                              className="text-neutral-500 hover:text-red-400 cursor-pointer"
                              title={studio('commissions_635_0')}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modular Form Schema Status & Builder Button */}
                <div className="pt-3 border-t border-neutral-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300">{studio('commissions_649_0')}</span>
                    {svc.form_schema && svc.form_schema.filter((b) => b.enabled).length > 0 ? (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                        {svc.form_schema.filter((b) => b.enabled).length} {' '}{studio('commissions_652_0')}{' '}</span>
                    ) : (
                      <span className="text-[10px] text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
                        {' '}{studio('commissions_656_0')}{' '}</span>
                    )}
                  </div>

                  {/* Active Blocks Badges */}
                  {svc.form_schema && svc.form_schema.filter((b) => b.enabled).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {svc.form_schema
                        .filter((b) => b.enabled)
                        .map((b) => {
                          let label = getCommissionBlockText(b, locale);
                          if (b.type === 'CHARACTER_COUNT') label = studio('characterSummary', { count: b.config.max_chars || 4, percent: b.config.extra_price_percent ?? 70 });
                          if (b.type === 'SCOPE_EXCLUSIONS') label = studio('exclusionSummary', { count: (b.config.exclusions || []).length });
                          if (b.type === 'BACKGROUND_TIER') label = studio('backgroundSummary', { count: (b.config.tiers || []).length });
                          if (b.type === 'RUSH_MODE') label = studio('commissions_671_0');
                          if (b.type === 'PRIVACY_NDA') label = `👁️ NDA ฿${b.config.price ?? 500}`;
                          if (b.type === 'CUSTOM_QUESTIONS') label = studio('questionSummary', { count: (b.config.questions || []).length });
                          return (
                            <span
                              key={b.id || b.type}
                              className="text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded-lg font-medium"
                            >
                              {label}
                            </span>
                          );
                        })}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setEditingScaleService(svc)}
                      className="py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-amber-500/60 rounded-xl text-xs font-bold text-neutral-200 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      {' '}{studio('commissions_693_0')}{' '}</button>
                    <button
                      type="button"
                      onClick={() => setEditingFormSchemaService(svc)}
                      className="py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-blue-500/60 rounded-xl text-xs font-bold text-neutral-200 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
                    >
                      <Settings className="w-3.5 h-3.5 text-blue-400" />
                      {' '}{studio('commissions_701_0')}{' '}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TOS & POLICY */}
      {activeTab === 'policy' && policyForm && (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 space-y-6 max-w-4xl">
          <div>
            <h3 className="text-base font-bold text-white">{studio('commissions_715_0')}</h3>
            <p className="text-xs text-neutral-400 mt-1">
              {' '}{studio('commissions_717_0')}{' '}</p>
            <textarea
              rows={4}
              value={policyForm.terms_of_service}
              onChange={(e) => setPolicyForm({ ...policyForm, terms_of_service: e.target.value })}
              placeholder={studio('commissions_723_0')}
              className="w-full mt-2 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold text-neutral-300">{studio('commissions_730_0')}</h4>
              <textarea
                rows={3}
                value={policyForm.refund_policy}
                onChange={(e) => setPolicyForm({ ...policyForm, refund_policy: e.target.value })}
                placeholder={studio('commissions_735_0')}
                className="w-full mt-1.5 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <h4 className="text-xs font-bold text-neutral-300">{studio('commissions_741_0')}</h4>
              <textarea
                rows={3}
                value={policyForm.ai_policy}
                onChange={(e) => setPolicyForm({ ...policyForm, ai_policy: e.target.value })}
                placeholder={studio('commissions_746_0')}
                className="w-full mt-1.5 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Do's & Don'ts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-800">
            {/* Will Draw */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> {' '}{studio('commissions_757_0')}{' '}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={willDrawInput}
                  onChange={(e) => setWillDrawInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddWillDraw())}
                  placeholder={studio('commissions_765_0')}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddWillDraw}
                  className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-600/30 cursor-pointer"
                >
                  {' '}{studio('commissions_773_0')}{' '}</button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {policyForm.will_draw?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveWillDraw(tag)}
                      className="hover:text-red-400 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Won't Draw */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> {' '}{studio('commissions_798_0')}{' '}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wontDrawInput}
                  onChange={(e) => setWontDrawInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddWontDraw())}
                  placeholder={studio('commissions_806_0')}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={handleAddWontDraw}
                  className="bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-600/30 cursor-pointer"
                >
                  {' '}{studio('commissions_814_0')}{' '}</button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {policyForm.wont_draw?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-lg"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveWontDraw(tag)}
                      className="hover:text-red-400 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Deposit & Revisions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-800">
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                {' '}{studio('commissions_841_0')}{' '}</label>
              <select
                value={policyForm.deposit_percent}
                onChange={(e) =>
                  setPolicyForm({ ...policyForm, deposit_percent: Number(e.target.value) })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value={50}>{studio('commissions_850_0')}</option>
                <option value={100}>{studio('commissions_851_0')}</option>
                <option value={30}>{studio('commissions_852_0')}</option>
                <option value={0}>{studio('commissions_853_0')}</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                {' '}{studio('commissions_859_0')}{' '}</label>
              <input
                type="number"
                min={0}
                max={10}
                value={policyForm.default_revision_quota}
                onChange={(e) =>
                  setPolicyForm({ ...policyForm, default_revision_quota: Number(e.target.value) })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex justify-end">
            <button
              onClick={() => savePolicyMutation.mutate(policyForm)}
              disabled={savePolicyMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {savePolicyMutation.isPending ? studio('commissions_880_1') : studio('commissions_880_2')}
            </button>
          </div>
        </div>
      )}

      {/* Decline Reason Modal */}
      {declineModalReq && (
        <StudioOverlay className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <StudioDialog label="Decline commission" onClose={() => setDeclineModalReq(null)} className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">{studio('commissions_890_0')}</h3>
            <p className="text-xs text-neutral-400">
              {' '}{studio('commissions_892_0')}{' '}</p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder={studio('commissions_898_0')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeclineModalReq(null)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                {' '}{studio('commissions_906_0')}{' '}</button>
              <button
                onClick={() => declineMutation.mutate()}
                disabled={!declineReason.trim() || declineMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {' '}{studio('commissions_913_0')}{' '}</button>
            </div>
          </StudioDialog>
        </StudioOverlay>
      )}

      {/* Add New Addon Modal */}
      {newAddonServiceId && (
        <StudioOverlay className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <StudioDialog label="Add service option" onClose={() => setNewAddonServiceId(null)} className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">{studio('commissions_924_0')}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">{studio('commissions_927_0')}</label>
                <input
                  type="text"
                  value={newAddonName}
                  onChange={(e) => setNewAddonName(e.target.value)}
                  placeholder={studio('commissions_932_0')}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">{studio('commissions_938_0')}</label>
                <select
                  value={newAddonType}
                  onChange={(e) => setNewAddonType(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="FIXED">{studio('commissions_944_0')}</option>
                  <option value="PERCENTAGE">{studio('commissions_945_0')}</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">{studio('commissions_950_0')}</label>
                <input
                  type="number" step="any"
                  min={0}
                  value={newAddonPrice}
                  onChange={(e) => setNewAddonPrice(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setNewAddonServiceId(null)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                {' '}{studio('commissions_966_0')}{' '}</button>
              <button
                onClick={() => addAddonMutation.mutate()}
                disabled={!newAddonName.trim() || addAddonMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                {' '}{studio('commissions_973_0')}{' '}</button>
            </div>
          </StudioDialog>
        </StudioOverlay>
      )}

      {/* Full Detail Modal */}
      {detailModalReq && (
        <StudioOverlay className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <StudioDialog label={locale === 'th' ? 'รายละเอียดงานคอมมิชชัน' : 'Commission brief'} onClose={() => setDetailModalReq(null)} className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[86vh] flex flex-col overflow-hidden">
            <div className="flex items-start justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/95 shrink-0">
              <div>
                <span className="text-xs text-blue-400 font-bold">{detailModalReq.service_title}</span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  {' '}{studio('commissions_988_0')}{' '}{detailModalReq.character_name}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalReq(null)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3.5">
              <CommissionBriefView brief={detailModalReq} />

              {/* Reference Images */}
              {detailModalReq.reference_images && detailModalReq.reference_images.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-neutral-300">
                    {' '}{studio('commissions_1084_1')}{detailModalReq.reference_images.length} {' '}{studio('commissions_1084_2')}{' '}</span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {detailModalReq.reference_images.map((img, idx) => (
                      <SecureReference
                        key={img}
                        src={`/api/commissions/requests/${detailModalReq.id}/references/${img}`}
                        title={img.replace(/^[0-9a-f]{32}_\d+_/, '')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end px-5 py-3 border-t border-neutral-800 bg-neutral-900/95 shrink-0">
              <button
                onClick={() => setDetailModalReq(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                {' '}{studio('commissions_1104_0')}{' '}</button>
            </div>
          </StudioDialog>
        </StudioOverlay>
      )}

      {/* New Scale / Form Modal */}
      {newScaleModalOpen && (
        <StudioOverlay className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <StudioFormDialog label="Create commission service" onClose={() => setNewScaleModalOpen(false)}
            onSubmit={(e) => {
              e.preventDefault();
              if (!newScaleTitle.trim()) {
                showHubMessage(studio('commissions_1118_0'));
                return;
              }
              createScaleMutation.mutate();
            }}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full shadow-2xl relative max-h-[88vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/95 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                {' '}{studio('commissions_1128_0')}{' '}</h3>
              <button
                type="button"
                onClick={() => setNewScaleModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-neutral-300 font-bold block mb-1">
                    {' '}{studio('commissions_1143_0')}{' '}<span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="input-new-scale-title"
                    value={newScaleTitle}
                    onChange={(e) => setNewScaleTitle(e.target.value)}
                    placeholder={studio('commissions_1151_0')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">{studio('commissions_1157_0')}</label>
                  <input
                    type="text"
                    data-testid="input-new-scale-category"
                    value={newScaleCategory}
                    onChange={(e) => setNewScaleCategory(e.target.value)}
                    placeholder={studio('commissions_1163_0')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-300 font-bold block mb-1">
                  {' '}{studio('commissions_1171_0')}{' '}</label>
                <textarea
                  rows={2}
                  data-testid="input-new-scale-description"
                  value={newScaleDescription}
                  onChange={(e) => setNewScaleDescription(e.target.value)}
                  placeholder={studio('commissions_1178_0')}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    {' '}{studio('commissions_1186_0')}{' '}<span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="number" step="0.01"
                    min={1}
                    required
                    data-testid="input-new-scale-price"
                    value={newScaleBasePrice}
                    onChange={(e) => setNewScaleBasePrice(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    {' '}{studio('commissions_1201_0')}{' '}</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    data-testid="input-new-scale-days"
                    value={newScaleEstimatedDays}
                    onChange={(e) => setNewScaleEstimatedDays(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    {' '}{studio('commissions_1216_0')}{' '}</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    data-testid="input-new-scale-slots"
                    value={newScaleMaxSlots}
                    onChange={(e) => setNewScaleMaxSlots(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    {' '}{studio('commissions_1231_0')}{' '}</label>
                  <select
                    value={newScaleIsOpen ? 'OPEN' : 'CLOSED'}
                    onChange={(e) => setNewScaleIsOpen(e.target.value === 'OPEN')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="OPEN">{studio('commissions_1238_0')}</option>
                    <option value="CLOSED">{studio('commissions_1239_0')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end px-5 py-3 border-t border-neutral-800 bg-neutral-900/95 shrink-0">
              <button
                type="button"
                onClick={() => setNewScaleModalOpen(false)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                {' '}{studio('commissions_1251_0')}{' '}</button>
              <button
                type="submit"
                data-testid="btn-submit-new-scale"
                disabled={!newScaleTitle.trim() || createScaleMutation.isPending}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {createScaleMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {' '}{studio('commissions_1261_0')}{' '}</>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> {' '}{studio('commissions_1265_0')}{' '}</>
                )}
              </button>
            </div>
          </StudioFormDialog>
        </StudioOverlay>
      )}

      {/* Modular Form Builder Modal */}
      {editingFormSchemaService && (
        <ModularFormBuilderModal
          isOpen={!!editingFormSchemaService}
          onClose={() => setEditingFormSchemaService(null)}
          service={editingFormSchemaService}
          onSave={(blocks) =>
            saveFormSchemaMutation.mutate({
              serviceId: editingFormSchemaService.id,
              blocks,
            })
          }
          isSaving={saveFormSchemaMutation.isPending}
        />
      )}

      {/* Edit Scale Modal */}
      {editingScaleService && (
        <EditScaleModal
          isOpen={!!editingScaleService}
          onClose={() => setEditingScaleService(null)}
          service={editingScaleService}
          onSave={(data) =>
            updateScaleMutation.mutate({
              serviceId: editingScaleService.id,
              data,
            })
          }
          isSaving={updateScaleMutation.isPending}
        />
      )}
    </div>
  );
}
