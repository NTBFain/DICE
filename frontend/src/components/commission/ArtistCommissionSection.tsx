'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthContext';
import {
  getArtistCommissionInfo,
  updateServiceScale,
  updateServiceFormSchema,
  createArtistService,
} from '@/lib/commissionApi';
import { CommissionServiceDetail, CommissionRequest, FormBlock } from '@/types/commission';
import DosDontsBadgeList from './DosDontsBadgeList';
import SlotAlertBell from './SlotAlertBell';
import CommissionIntakeModal from './CommissionIntakeModal';
import { EditScaleModal } from './EditScaleModal';
import { ModularFormBuilderModal } from './ModularFormBuilderModal';
import {
  Sparkles,
  Clock,
  Layers,
  CheckCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Edit3,
  Settings,
  Eye,
  Plus,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { Link } from '@/i18n/routing';

interface ArtistCommissionSectionProps {
  handle: string;
}

export default function ArtistCommissionSection({ handle }: ArtistCommissionSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedService, setSelectedService] = useState<CommissionServiceDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittedReq, setSubmittedReq] = useState<CommissionRequest | null>(null);
  const [showTos, setShowTos] = useState(false);

  // Owner editing states
  const [editingScaleService, setEditingScaleService] = useState<CommissionServiceDetail | null>(null);
  const [editingFormSchemaService, setEditingFormSchemaService] = useState<CommissionServiceDetail | null>(null);
  const [newScaleModalOpen, setNewScaleModalOpen] = useState(false);
  const [newScaleTitle, setNewScaleTitle] = useState('');
  const [newScaleCategory, setNewScaleCategory] = useState('Illustration');
  const [newScaleDescription, setNewScaleDescription] = useState('');
  const [newScaleBasePrice, setNewScaleBasePrice] = useState(500);
  const [newScaleEstimatedDays, setNewScaleEstimatedDays] = useState(7);
  const [newScaleMaxSlots, setNewScaleMaxSlots] = useState(3);
  const [newScaleIsOpen, setNewScaleIsOpen] = useState(true);

  const { data: commissionInfo, isLoading, error } = useQuery({
    queryKey: ['artist-commission-info', handle],
    queryFn: () => getArtistCommissionInfo(handle),
  });

  const updateScaleMutation = useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: number; data: Partial<CommissionServiceDetail> }) =>
      updateServiceScale(serviceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info', handle] });
      setEditingScaleService(null);
      alert('บันทึกการแก้ไขสเกลงานเรียบร้อยแล้ว!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการแก้ไขสเกลงาน');
    },
  });

  const saveFormSchemaMutation = useMutation({
    mutationFn: ({ serviceId, blocks }: { serviceId: number; blocks: FormBlock[] }) =>
      updateServiceFormSchema(serviceId, blocks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info', handle] });
      setEditingFormSchemaService(null);
      alert('บันทึกรูปแบบฟอร์มบรีฟสำหรับสเกลนี้เรียบร้อยแล้ว!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการบันทึกฟอร์ม');
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
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info', handle] });
      setNewScaleModalOpen(false);
      setNewScaleTitle('');
      setNewScaleDescription('');
      setNewScaleBasePrice(500);
      setNewScaleEstimatedDays(7);
      setNewScaleMaxSlots(3);
      setNewScaleIsOpen(true);
      alert('สร้างสเกลงานใหม่สำเร็จ!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'เกิดข้อผิดพลาดในการสร้างสเกล');
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-neutral-400 bg-neutral-900/40 rounded-2xl border border-neutral-800">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
        <p className="text-xs font-semibold">กำลังโหลดข้อมูลแพ็กเกจคอมมิชชัน...</p>
      </div>
    );
  }

  if (error || !commissionInfo) {
    return null;
  }

  const { policy, services, artist_id, artist_user_id } = commissionInfo;

  // Determine if logged-in user is the artist owner
  const isOwner = Boolean(
    user && (
      (artist_user_id && user.id === artist_user_id) ||
      (user.is_artist && (user.id === artist_id || user.full_name?.toLowerCase().includes('akira')))
    )
  );

  const handleOpenIntake = (svc: CommissionServiceDetail) => {
    setSelectedService(svc);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Artist Owner Quick Management Bar */}
      {isOwner && (
        <div className="bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-blue-950/40 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">โหมดจัดการร้านค้าของศิลปิน (Artist Owner)</h4>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-extrabold px-2 py-0.5 rounded-full border border-blue-500/30">
                  คุณเป็นเจ้าของหน้านี้
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-0.5">
                คุณสามารถกด ✏️ แก้ไขสเกล, ⚙️ ปรับกล่องฟอร์มบรีฟ หรือกด 👁️ ทดลองเปิดฟอร์ม ได้โดยตรงจากหน้านี้
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            <button
              onClick={() => setNewScaleModalOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> + เพิ่มสเกลใหม่
            </button>
            <Link
              href="/dashboard/artist/commissions?tab=scales"
              className="flex-1 sm:flex-none px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" /> ไปยัง Hub หลังบ้าน
            </Link>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {submittedReq && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-start justify-between gap-3 text-emerald-400">
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">ส่งคำขอจ้างงานเรียบร้อยแล้ว!</h4>
              <p className="text-xs text-neutral-300 mt-0.5">
                ศิลปินได้รับบรีฟ {submittedReq.character_name} เรียบร้อยแล้ว ระบบจะส่งการแจ้งเตือนทันทีที่ศิลปินตอบรับคำขอ
              </p>
            </div>
          </div>
          <button
            onClick={() => setSubmittedReq(null)}
            className="text-neutral-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Do's & Don'ts */}
      {policy && (
        <DosDontsBadgeList willDraw={policy.will_draw} wontDraw={policy.wont_draw} />
      )}

      {/* Commission Services Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>สเกลงานที่เปิดรับ (Commission Services &amp; Scales)</span>
          </h3>

          <div className="flex items-center gap-3">
            {isOwner && (
              <button
                onClick={() => setNewScaleModalOpen(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มสเกล
              </button>
            )}

            {policy?.terms_of_service && (
              <button
                onClick={() => setShowTos(!showTos)}
                className="text-xs text-neutral-400 hover:text-blue-400 flex items-center gap-1 cursor-pointer font-semibold"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>สัญญา TOS ของศิลปิน</span>
                {showTos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible TOS */}
        {showTos && policy?.terms_of_service && (
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 text-xs text-neutral-300 space-y-2 whitespace-pre-wrap leading-relaxed">
            <h4 className="font-bold text-white">ข้อตกลงและลิขสิทธิ์ (Terms of Service):</h4>
            <p>{policy.terms_of_service}</p>
            {policy.refund_policy && (
              <div className="pt-2 border-t border-neutral-800">
                <span className="font-bold text-white block">นโยบายการคืนเงิน:</span>
                <p>{policy.refund_policy}</p>
              </div>
            )}
            <div className="pt-2 border-t border-neutral-800 text-emerald-400 font-semibold">
              ✓ {policy.ai_policy}
            </div>
          </div>
        )}

        {services.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 bg-neutral-900/40 rounded-2xl border border-neutral-800 text-xs">
            ศิลปินยังไม่ได้เปิดแพ็กเกจสเกลงานในขณะนี้
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((svc) => {
              const isAvailable = svc.effective_status === 'OPEN' || svc.effective_status === 'WAITLIST';

              return (
                <div
                  key={svc.id}
                  className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4 hover:border-neutral-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                          {svc.category}
                        </span>
                        <h4 className="text-base font-bold text-white mt-1">{svc.title}</h4>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          svc.effective_status === 'OPEN'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : svc.effective_status === 'WAITLIST'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}
                      >
                        {svc.effective_status === 'OPEN'
                          ? `🟢 เปิดรับ (${svc.max_slots - svc.used_slots} สล็อต)`
                          : svc.effective_status === 'WAITLIST'
                          ? '🟡 รอคิว (Waitlist)'
                          : '⚫ ปิดรับชั่วคราว'}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                      {svc.description}
                    </p>

                    {/* Stats pills */}
                    <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/60 text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-500 block">ราคาเริ่มต้น:</span>
                        <span className="font-bold text-emerald-400">฿{svc.base_price.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block">ระยะเวลาเฉลี่ย:</span>
                        <span className="font-bold text-neutral-200">{svc.estimated_days} วัน</span>
                      </div>
                    </div>

                    {/* Modular Form Blocks active tags preview */}
                    {svc.form_schema && svc.form_schema.filter((b) => b.enabled).length > 0 && (
                      <div className="text-[11px] text-neutral-400 space-y-1">
                        <span className="text-[10px] text-neutral-500 block font-bold">กล่องฟอร์มที่เปิดใช้:</span>
                        <div className="flex flex-wrap gap-1">
                          {svc.form_schema.filter((b) => b.enabled).map((b) => (
                            <span
                              key={b.id || b.type}
                              className="bg-neutral-950 px-2 py-0.5 rounded-md text-[10px] border border-neutral-800 text-blue-300"
                            >
                              ✓ {b.title || b.type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Addons Preview */}
                    {svc.addons.length > 0 && (
                      <div className="text-[11px] text-neutral-400 space-y-1">
                        <span className="text-[10px] text-neutral-500 block font-bold">ตัวเลือกเสริมที่มีให้เลือก:</span>
                        <div className="flex flex-wrap gap-1">
                          {svc.addons.slice(0, 3).map((ad) => (
                            <span
                              key={ad.id}
                              className="bg-neutral-950 px-2 py-0.5 rounded-md text-[10px] border border-neutral-800"
                            >
                              +{ad.name}
                            </span>
                          ))}
                          {svc.addons.length > 3 && (
                            <span className="text-[10px] text-neutral-500 self-center">
                              +{svc.addons.length - 3} รายการ
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                    {/* Owner Management Buttons */}
                    {isOwner && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingScaleService(svc)}
                          className="py-2 px-2.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 rounded-xl text-xs font-bold text-neutral-200 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          ✏️ แก้ไขสเกล
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingFormSchemaService(svc)}
                          className="py-2 px-2.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 rounded-xl text-xs font-bold text-neutral-200 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
                        >
                          <Settings className="w-3.5 h-3.5 text-blue-400" />
                          ⚙️ ปรับฟอร์มบรีฟ
                        </button>
                      </div>
                    )}

                    {/* Client Intake Button or Owner Preview Button */}
                    {isAvailable ? (
                      <button
                        onClick={() => handleOpenIntake(svc)}
                        className={`w-full text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                          isOwner
                            ? 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 shadow-neutral-900/50'
                            : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                        }`}
                      >
                        {isOwner ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-blue-400" /> 👁️ ทดลองเปิดฟอร์มบรีฟ (Preview)
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> ส่งบรีฟขอจ้างงาน
                          </>
                        )}
                      </button>
                    ) : isOwner ? (
                      <button
                        onClick={() => handleOpenIntake(svc)}
                        className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" /> 👁️ ทดลองเปิดฟอร์มบรีฟ (Preview แม้คิวปิด)
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-between gap-2">
                        <span className="text-[11px] text-neutral-500 italic">คิวเต็มหรือปิดรับ</span>
                        <SlotAlertBell
                          artistId={artist_id}
                          serviceId={svc.id}
                          className="flex-1 justify-center"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Client Intake Modal */}
      {selectedService && (
        <CommissionIntakeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          service={selectedService}
          policy={policy}
          artistHandle={handle}
          onSuccess={(req) => {
            setIsModalOpen(false);
            setSubmittedReq(req);
          }}
        />
      )}

      {/* Owner: Edit Scale Modal */}
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

      {/* Owner: Modular Form Builder Modal */}
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

      {/* Owner: New Scale Modal */}
      {newScaleModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
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
            {/* Fixed Header */}
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

            {/* Compact Multi-column Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-neutral-300 font-bold block mb-1">
                    ชื่อสเกลงาน (Scale Title) <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="input-new-scale-title-public"
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
                    data-testid="input-new-scale-category-public"
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
                  data-testid="input-new-scale-description-public"
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
                    data-testid="input-new-scale-price-public"
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
                    data-testid="input-new-scale-days-public"
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
                    data-testid="input-new-scale-slots-public"
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

            {/* Fixed Footer */}
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
                data-testid="btn-submit-new-scale-public"
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
        </div>,
        document.body
      )}
    </div>
  );
}
