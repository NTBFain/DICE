'use client';

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
import { EditScaleModal } from '@/components/commission/EditScaleModal';

export default function ArtistCommissionsDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
      alert('ยอมรับคำขอคอมมิชชันและสร้างออเดอร์ในคิวงานเรียบร้อยแล้ว!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการยอมรับคำขอ');
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => declineCommissionRequest(declineModalReq!.id, declineReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-incoming-requests'] });
      setDeclineModalReq(null);
      setDeclineReason('');
      alert('ปฏิเสธคำขอและส่งเหตุผลไปยังผู้จ้างแล้ว');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'เกิดข้อผิดพลาด');
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ serviceId, isFormOpen }: { serviceId: number; isFormOpen: boolean }) =>
      updateServiceAvailability(serviceId, isFormOpen, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการสลับสถานะ');
    },
  });

  const savePolicyMutation = useMutation({
    mutationFn: (data: Partial<CommissionPolicy>) => updateCommissionPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info'] });
      alert('บันทึกเงื่อนไขสัญญา TOS และนโยบายเรียบร้อยแล้ว!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการบันทึกนโยบาย');
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
      alert('สร้างสเกลงานใหม่เรียบร้อยแล้ว!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการสร้างสเกลงาน');
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
      alert('บันทึกรูปแบบฟอร์มบรีฟสำหรับสเกลนี้เรียบร้อยแล้ว!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการบันทึกฟอร์ม');
    },
  });

  const updateScaleMutation = useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: number; data: Partial<CommissionServiceDetail> }) =>
      updateServiceScale(serviceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info'] });
      setEditingScaleService(null);
      alert('บันทึกการแก้ไขสเกลงานเรียบร้อยแล้ว!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการแก้ไขสเกลงาน');
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
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900/60 border border-neutral-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            VGen-Style Commission Hub
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            จัดการระบบรับงานหลายสเกล, สัญญา TOS, ข้อจำกัด Do&apos;s &amp; Don&apos;ts, และกล่องคัดกรองคำขอ
          </p>
        </div>

        {profile && (
          <Link
            href={`/artists/${profile.handle}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-xl hover:bg-blue-500/20 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> ดูหน้าฟอร์มสาธารณะ
          </Link>
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
          คำขอที่ส่งเข้ามา (Inbox)
          {requests.filter((r) => r.status === 'PENDING').length > 0 && (
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
          สเกลงาน &amp; สล็อต (Scales &amp; Slots)
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'policy'
              ? 'border-blue-500 text-white bg-blue-500/5'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-400" />
          สัญญา TOS &amp; Do&apos;s / Don&apos;ts
        </button>
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
                {st === 'ALL' ? 'ทั้งหมด' : st}
              </button>
            ))}
          </div>

          {loadingRequests ? (
            <div className="p-12 text-center text-neutral-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
              กำลังโหลดรายการคำขอ...
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400">
              <Inbox className="w-12 h-12 mx-auto text-neutral-600 mb-2" />
              <p className="text-sm font-bold">ไม่มีคำขอคอมมิชชันในหมวดหมู่นี้</p>
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
                          ผู้จ้าง: {req.client_name || req.client_email || 'Client'}
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
                        {req.status}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 line-clamp-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800/60 whitespace-pre-wrap">
                      {req.brief}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                      <div>
                        <span className="text-neutral-500 block text-[10px]">การนำไปใช้:</span>
                        <span className="font-semibold text-neutral-200">{req.usage_type}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block text-[10px]">ขนาดภาพ:</span>
                        <span className="font-semibold text-neutral-200">{req.canvas_size}</span>
                      </div>
                    </div>

                    {req.addons_snapshot && req.addons_snapshot.length > 0 && (
                      <div className="text-[11px] bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/40">
                        <span className="text-neutral-400 block font-bold mb-1">Add-ons ที่เลือก:</span>
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
                      <span className="text-xs text-neutral-400">ราคารวมประเมิน:</span>
                      <span className="text-lg font-bold text-emerald-400">
                        ฿{req.total_price.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDetailModalReq(req)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> ดูบรีฟฉบับเต็ม
                      </button>

                      {req.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => acceptMutation.mutate(req.id)}
                            disabled={acceptMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> ยอมรับงาน
                          </button>

                          <button
                            onClick={() => setDeclineModalReq(req)}
                            className="flex items-center justify-center p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl transition-colors cursor-pointer"
                            title="ปฏิเสธคำขอ"
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
                สเกลงานและแบบฟอร์มเปิดรับงาน (Commission Scales &amp; Forms)
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                สร้างสเกลงานใหม่ กำหนดราคา สล็อตจำกัด และตัวเลือกเสริม (Add-ons) ของแต่ละสเกล
              </p>
            </div>
            <button
              onClick={() => setNewScaleModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" /> เพิ่มสเกลงานใหม่
            </button>
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
                        title="แก้ไขข้อมูลสเกลงานนี้"
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
                        title="ลบสเกลงานนี้"
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
                      {svc.is_form_open ? 'เปิดรับฟอร์ม' : 'ปิดรับฟอร์ม'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800/60 text-center">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">ราคาเริ่มต้น</span>
                    <span className="text-sm font-bold text-white">฿{svc.base_price.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">ระยะเวลาเฉลี่ย</span>
                    <span className="text-sm font-bold text-white">{svc.estimated_days} วัน</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">สล็อตที่รับอยู่</span>
                    <span
                      className={`text-sm font-bold ${
                        svc.used_slots >= svc.max_slots ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {svc.used_slots} / {svc.max_slots} คิว
                    </span>
                  </div>
                </div>

                {/* Add-ons List */}
                <div className="space-y-2 pt-2 border-t border-neutral-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300">ตัวเลือกเสริม (Add-ons):</span>
                    <button
                      onClick={() => setNewAddonServiceId(svc.id)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Plus className="w-3 h-3" /> เพิ่ม Add-on
                    </button>
                  </div>

                  {svc.addons.length === 0 ? (
                    <p className="text-[11px] text-neutral-500 italic">ยังไม่มีตัวเลือกเสริมสำหรับสเกลนี้</p>
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
                              title="ลบตัวเลือกเสริม"
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
                    <span className="text-xs font-bold text-neutral-300">กล่องฟอร์มบรีฟ (Form Blocks):</span>
                    {svc.form_schema && svc.form_schema.filter((b) => b.enabled).length > 0 ? (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                        {svc.form_schema.filter((b) => b.enabled).length} บล็อกทำงาน
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
                        ฟอร์มมาตรฐาน
                      </span>
                    )}
                  </div>

                  {/* Active Blocks Badges */}
                  {svc.form_schema && svc.form_schema.filter((b) => b.enabled).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {svc.form_schema
                        .filter((b) => b.enabled)
                        .map((b) => {
                          let label = b.title || b.type;
                          if (b.type === 'CHARACTER_COUNT') label = `👥 สูงสุด ${b.config.max_chars || 4} ตัว (+${b.config.extra_price_percent || 70}%)`;
                          if (b.type === 'SCOPE_EXCLUSIONS') label = `🚫 ${(b.config.exclusions || []).length} ข้อห้าม`;
                          if (b.type === 'BACKGROUND_TIER') label = `🌄 ฉาก ${(b.config.tiers || []).length} ระดับ`;
                          if (b.type === 'RUSH_MODE') label = `⚡ งานด่วน`;
                          if (b.type === 'PRIVACY_NDA') label = `👁️ NDA ฿${b.config.price || 500}`;
                          if (b.type === 'CUSTOM_QUESTIONS') label = `❓ ${(b.config.questions || []).length} คำถามพิเศษ`;
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
                      ✏️ แก้ไขสเกล
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingFormSchemaService(svc)}
                      className="py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-blue-500/60 rounded-xl text-xs font-bold text-neutral-200 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
                    >
                      <Settings className="w-3.5 h-3.5 text-blue-400" />
                      ⚙️ ปรับฟอร์มบรีฟ
                    </button>
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
            <h3 className="text-base font-bold text-white">ข้อตกลงและเงื่อนไขสัญญา (Terms of Service)</h3>
            <p className="text-xs text-neutral-400 mt-1">
              ข้อตกลงนี้จะถูกแสดงให้ผู้จ้างกดยอมรับก่อนส่งบรีฟ และระบบจะบันทึก Snapshot สัญญาฉบับนี้ไว้เป็นหลักฐาน
            </p>
            <textarea
              rows={4}
              value={policyForm.terms_of_service}
              onChange={(e) => setPolicyForm({ ...policyForm, terms_of_service: e.target.value })}
              placeholder="ระบุข้อตกลงและลิขสิทธิ์ เช่น ไม่อนุญาตให้นำไปดัดแปลงเชิงพาณิชย์โดยไม่ได้รับอนุญาต..."
              className="w-full mt-2 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold text-neutral-300">นโยบายการคืนเงิน (Refund Policy)</h4>
              <textarea
                rows={3}
                value={policyForm.refund_policy}
                onChange={(e) => setPolicyForm({ ...policyForm, refund_policy: e.target.value })}
                placeholder="เช่น คืนเงินได้ 50% ในขั้นตอนร่างภาพ..."
                className="w-full mt-1.5 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <h4 className="text-xs font-bold text-neutral-300">นโยบายการใช้กับ AI (No-AI Policy)</h4>
              <textarea
                rows={3}
                value={policyForm.ai_policy}
                onChange={(e) => setPolicyForm({ ...policyForm, ai_policy: e.target.value })}
                placeholder="เช่น ห้ามนำผลงานไปป้อน Machine Learning หรือเทรนโมเดล AI เด็ดขาด..."
                className="w-full mt-1.5 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Do's & Don'ts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-800">
            {/* Will Draw */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> สิ่งที่รับวาด (Will Draw):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={willDrawInput}
                  onChange={(e) => setWillDrawInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddWillDraw())}
                  placeholder="เช่น OC, Fanart, Chibi..."
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddWillDraw}
                  className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-600/30 cursor-pointer"
                >
                  เพิ่ม
                </button>
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
                <ShieldAlert className="w-3.5 h-3.5" /> สิ่งที่ไม่รับวาด (Won&apos;t Draw):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wontDrawInput}
                  onChange={(e) => setWontDrawInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddWontDraw())}
                  placeholder="เช่น NSFW 18+, Mecha, เลือดสาด..."
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={handleAddWontDraw}
                  className="bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-600/30 cursor-pointer"
                >
                  เพิ่ม
                </button>
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
                สัดส่วนเงินมัดจำงวดแรก (% Deposit):
              </label>
              <select
                value={policyForm.deposit_percent}
                onChange={(e) =>
                  setPolicyForm({ ...policyForm, deposit_percent: Number(e.target.value) })
                }
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value={50}>50% มัดจำเริ่มต้น (แนะนำตามมาตรฐาน)</option>
                <option value={100}>100% ชำระเต็มจำนวนล่วงหน้า</option>
                <option value={30}>30% มัดจำงวดแรก</option>
                <option value={0}>0% จ่ายเต็มเมื่องานเสร็จสิ้น</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">
                โควตาการแก้งานฟรี (Revision Quota):
              </label>
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
              {savePolicyMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าสัญญา TOS'}
            </button>
          </div>
        </div>
      )}

      {/* Decline Reason Modal */}
      {declineModalReq && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">ปฏิเสธคำขอคอมมิชชัน</h3>
            <p className="text-xs text-neutral-400">
              โปรดระบุเหตุผลที่ไม่สามารถรับงานนี้ได้ (เช่น คิวเต็ม, สเกลงานไม่ตรงแนวถนัด)
            </p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="ระบุเหตุผล..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeclineModalReq(null)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => declineMutation.mutate()}
                disabled={!declineReason.trim() || declineMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                ยืนยันการปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Addon Modal */}
      {newAddonServiceId && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white">เพิ่มตัวเลือกเสริม (Add-on)</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">ชื่อตัวเลือกเสริม:</label>
                <input
                  type="text"
                  value={newAddonName}
                  onChange={(e) => setNewAddonName(e.target.value)}
                  placeholder="เช่น ฉากหลังละเอียด, ไฟล์ PSD..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">ประเภทการคิดราคา:</label>
                <select
                  value={newAddonType}
                  onChange={(e) => setNewAddonType(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="FIXED">จำนวนเงินตายตัว (+฿)</option>
                  <option value="PERCENTAGE">เปอร์เซ็นต์ของราคาฐาน (+%)</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">มูลค่าราคา:</label>
                <input
                  type="number"
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
                ยกเลิก
              </button>
              <button
                onClick={() => addAddonMutation.mutate()}
                disabled={!newAddonName.trim() || addAddonMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                เพิ่ม Add-on
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Detail Modal */}
      {detailModalReq && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[86vh] flex flex-col overflow-hidden">
            <div className="flex items-start justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/95 shrink-0">
              <div>
                <span className="text-xs text-blue-400 font-bold">{detailModalReq.service_title}</span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  รายละเอียดบรีฟ: {detailModalReq.character_name}
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
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3 text-xs">
                <div>
                  <span className="text-neutral-500 font-bold block">คำอธิบายรายละเอียดบรีฟ:</span>
                  <p className="text-neutral-200 mt-1 whitespace-pre-wrap leading-relaxed">
                    {detailModalReq.brief}
                  </p>
                </div>

                {detailModalReq.reference_links && (
                  <div>
                    <span className="text-neutral-500 font-bold block">ลิงก์ภาพอ้างอิงภายนอก:</span>
                    <a
                      href={detailModalReq.reference_links}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 underline break-all hover:text-blue-300"
                    >
                      {detailModalReq.reference_links}
                    </a>
                  </div>
                )}

                {/* Custom Modular Form Responses */}
                {detailModalReq.custom_responses && Object.keys(detailModalReq.custom_responses).length > 0 && (
                  <div className="pt-2 border-t border-neutral-800 space-y-1.5">
                    <span className="text-blue-400 font-bold block">รายละเอียดตามกล่องฟอร์มบรีฟ (Form Specs):</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800/60">
                      {detailModalReq.custom_responses.character_count && (
                        <div>
                          <span className="text-neutral-500">จำนวนตัวละคร: </span>
                          <span className="text-white font-bold">{detailModalReq.custom_responses.character_count} ตัว</span>
                        </div>
                      )}
                      {detailModalReq.custom_responses.background_tier && (
                        <div>
                          <span className="text-neutral-500">ฉากหลัง: </span>
                          <span className="text-emerald-400 font-bold">
                            {typeof detailModalReq.custom_responses.background_tier === 'object'
                              ? detailModalReq.custom_responses.background_tier.label
                              : detailModalReq.custom_responses.background_tier}
                          </span>
                        </div>
                      )}
                      {detailModalReq.custom_responses.rush_order && (
                        <div>
                          <span className="text-neutral-500">งานเร่งด่วน: </span>
                          <span className="text-yellow-400 font-bold">
                            ภายใน {detailModalReq.custom_responses.rush_order.days} วัน (+{detailModalReq.custom_responses.rush_order.percent}%)
                          </span>
                        </div>
                      )}
                      {detailModalReq.custom_responses.privacy_nda && (
                        <div>
                          <span className="text-neutral-500">สัญญา NDA: </span>
                          <span className="text-purple-400 font-bold">🔒 ขอปิดเป็นความลับก่อนเปิดตัว</span>
                        </div>
                      )}
                      {detailModalReq.custom_responses.pose_expression && (
                        <div className="col-span-2">
                          <span className="text-neutral-500">ท่าทาง &amp; สีหน้า: </span>
                          <span className="text-pink-300 font-medium">{detailModalReq.custom_responses.pose_expression}</span>
                        </div>
                      )}
                      {detailModalReq.custom_responses.canvas_spec && (
                        <div>
                          <span className="text-neutral-500">สัดส่วนภาพ: </span>
                          <span className="text-white font-bold">{detailModalReq.custom_responses.canvas_spec}</span>
                        </div>
                      )}
                      {detailModalReq.custom_responses.custom_answers && Object.entries(detailModalReq.custom_responses.custom_answers).map(([k, v]) => (
                        <div key={k} className="col-span-2">
                          <span className="text-neutral-500">คำถามพิเศษ ({k}): </span>
                          <span className="text-blue-300">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reference Images */}
              {detailModalReq.reference_images && detailModalReq.reference_images.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-neutral-300">
                    ภาพ Reference ที่แนบมา ({detailModalReq.reference_images.length} รูป):
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {detailModalReq.reference_images.map((img, idx) => (
                      <a
                        key={idx}
                        href={`/api/commissions/requests/${detailModalReq.id}/references/${img}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 hover:border-blue-500 transition-colors group relative"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/commissions/requests/${detailModalReq.id}/references/${img}`}
                          alt="Reference"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </a>
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
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Scale / Form Modal */}
      {newScaleModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newScaleTitle.trim()) {
                alert('กรุณากรอกชื่อสเกลงาน');
                return;
              }
              createScaleMutation.mutate();
            }}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full shadow-2xl relative max-h-[88vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/95 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                เพิ่มสเกลงาน / ฟอร์มคอมมิชชันใหม่
              </h3>
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
                    ชื่อสเกลงาน (Scale Title) <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="input-new-scale-title"
                    value={newScaleTitle}
                    onChange={(e) => setNewScaleTitle(e.target.value)}
                    placeholder="เช่น Full-body Character, Bust-up Avatar..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">หมวดหมู่ (Category):</label>
                  <input
                    type="text"
                    data-testid="input-new-scale-category"
                    value={newScaleCategory}
                    onChange={(e) => setNewScaleCategory(e.target.value)}
                    placeholder="เช่น Illustration..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-300 font-bold block mb-1">
                  รายละเอียดสเกลงาน (Description):
                </label>
                <textarea
                  rows={2}
                  data-testid="input-new-scale-description"
                  value={newScaleDescription}
                  onChange={(e) => setNewScaleDescription(e.target.value)}
                  placeholder="อธิบายขอบเขตของสเกลนี้ เช่น วาดเต็มตัว ลงสีละเอียด พร้อมฉากหลังธรรมดา..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    ราคาเริ่มต้น (฿) <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="number"
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
                    เวลาเฉลี่ย (วัน):
                  </label>
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
                    สล็อตสูงสุด:
                  </label>
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
                    สถานะฟอร์ม:
                  </label>
                  <select
                    value={newScaleIsOpen ? 'OPEN' : 'CLOSED'}
                    onChange={(e) => setNewScaleIsOpen(e.target.value === 'OPEN')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="OPEN">🟢 เปิดรับ</option>
                    <option value="CLOSED">⚫ ปิดรับ</option>
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
                ยกเลิก
              </button>
              <button
                type="submit"
                data-testid="btn-submit-new-scale"
                disabled={!newScaleTitle.trim() || createScaleMutation.isPending}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {createScaleMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังสร้าง...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> สร้างสเกลงาน
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
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
