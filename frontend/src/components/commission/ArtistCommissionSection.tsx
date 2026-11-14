'use client';

import { useLocale } from 'next-intl';
import { StudioFormDialog } from '@/components/StudioDialog';
import { isArtistProfileOwner } from '@/lib/artistOwnership';
import { getCommissionBlockText } from '@/lib/commissionBlockText';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { Link, useRouter } from '@/i18n/routing';

interface ArtistCommissionSectionProps {
  handle: string;
}

export default function ArtistCommissionSection({ handle }: ArtistCommissionSectionProps) {
  const locale = useLocale();
  const { user } = useAuth();
  const c = useTranslations('ArtistClient');
  const o = useTranslations('ArtistOwner');
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedService, setSelectedService] = useState<CommissionServiceDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openedServiceIds, setOpenedServiceIds] = useState<number[]>([]);
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
      alert(o('scaleSaved'));
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || o('scaleError'));
    },
  });

  const saveFormSchemaMutation = useMutation({
    mutationFn: ({ serviceId, blocks }: { serviceId: number; blocks: FormBlock[] }) =>
      updateServiceFormSchema(serviceId, blocks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist-commission-info', handle] });
      setEditingFormSchemaService(null);
      alert(o('formSaved'));
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || o('formError'));
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
      alert(o('created'));
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || o('createError'));
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-neutral-400 bg-neutral-900/40 rounded-2xl border border-neutral-800">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
        <p className="text-xs font-semibold">{c('loadingServices')}</p>
      </div>
    );
  }

  if (error || !commissionInfo) {
    return null;
  }

  const { policy, services, artist_id, artist_user_id } = commissionInfo;

  const isOwner = isArtistProfileOwner(user, artist_user_id);

  const handleOpenIntake = (svc: CommissionServiceDetail) => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/artists/${handle}`)}`);
      return;
    }
    setOpenedServiceIds((ids) => ids.includes(svc.id) ? ids : [...ids, svc.id]);
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
                <h4 className="text-sm font-bold text-white">{o('ownerTitle')}</h4>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-extrabold px-2 py-0.5 rounded-full border border-blue-500/30">
                  {' '}{o('ownerBadge')}{' '}</span>
              </div>
              <p className="text-xs text-neutral-300 mt-0.5">
                {' '}{o('ownerHelp')}{' '}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            <button
              onClick={() => setNewScaleModalOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> {' '}{o('addNew')}{' '}</button>
            <Link
              href="/dashboard/artist/commissions?tab=scales"
              className="flex-1 sm:flex-none px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" /> {' '}{o('studio')}{' '}</Link>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {submittedReq && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-start justify-between gap-3 text-emerald-400">
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">{c('requestSent')}</h4>
              <p className="text-xs text-neutral-300 mt-0.5">
                {c('receivedBrief',{character:submittedReq.character_name})}
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
            <span>{c('scales')}</span>
          </h3>

          <div className="flex items-center gap-3">
            {isOwner && (
              <button
                onClick={() => setNewScaleModalOpen(true)}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> {' '}{o('add')}{' '}</button>
            )}

            {policy?.terms_of_service && (
              <button
                onClick={() => setShowTos(!showTos)}
                className="text-xs text-neutral-400 hover:text-blue-400 flex items-center gap-1 cursor-pointer font-semibold"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{c('artistTerms')}</span>
                {showTos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible TOS */}
        {showTos && policy?.terms_of_service && (
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 text-xs text-neutral-300 space-y-2 whitespace-pre-wrap leading-relaxed">
            <h4 className="font-bold text-white">{c('terms')}</h4>
            <p>{policy.terms_of_service}</p>
            {policy.refund_policy && (
              <div className="pt-2 border-t border-neutral-800">
                <span className="font-bold text-white block">{c('refund')}</span>
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
            {c('emptyServices')}
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
                          ? c('slotsOpen',{count:svc.max_slots-svc.used_slots})
                          : svc.effective_status === 'WAITLIST'
                          ? c('slotWaitlist')
                          : svc.effective_status === 'FULL' ? c('slotFull') : c('slotClosed')}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                      {svc.description}
                    </p>

                    {/* Stats pills */}
                    <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/60 text-xs">
                      <div>
                        <span className="text-[10px] text-neutral-500 block">{c('startingPrice')}</span>
                        <span className="font-bold text-emerald-400">฿{svc.base_price.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 block">{c('duration')}</span>
                        <span className="font-bold text-neutral-200">{c('days',{days:svc.estimated_days})}</span>
                      </div>
                    </div>

                    {/* Modular Form Blocks active tags preview */}
                    {svc.form_schema && svc.form_schema.filter((b) => b.enabled).length > 0 && (
                      <div className="text-[11px] text-neutral-400 space-y-1">
                        <span className="text-[10px] text-neutral-500 block font-bold">{c('formOptions')}</span>
                        <div className="flex flex-wrap gap-1">
                          {svc.form_schema.filter((b) => b.enabled).map((b) => (
                            <span
                              key={b.id || b.type}
                              className="bg-neutral-950 px-2 py-0.5 rounded-md text-[10px] border border-neutral-800 text-blue-300"
                            >
                              ✓ {getCommissionBlockText(b, locale)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Addons Preview */}
                    {svc.addons.length > 0 && (
                      <div className="text-[11px] text-neutral-400 space-y-1">
                        <span className="text-[10px] text-neutral-500 block font-bold">{c('availableAddons')}</span>
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
                              {c('moreAddons',{count:svc.addons.length-3})}
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
                          {' '}{o('edit')}{' '}</button>
                        <button
                          type="button"
                          onClick={() => setEditingFormSchemaService(svc)}
                          className="py-2 px-2.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-blue-500/50 rounded-xl text-xs font-bold text-neutral-200 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition shadow-sm"
                        >
                          <Settings className="w-3.5 h-3.5 text-blue-400" />
                          {' '}{o('configure')}{' '}</button>
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
                            <Eye className="w-3.5 h-3.5 text-blue-400" /> {' '}{o('preview')}{' '}</>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> {c('request')}
                          </>
                        )}
                      </button>
                    ) : isOwner ? (
                      <button
                        onClick={() => handleOpenIntake(svc)}
                        className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" /> {' '}{o('previewClosed')}{' '}</button>
                    ) : (
                      <div className="w-full flex items-center justify-between gap-2">
                        <span className="text-[11px] text-neutral-500 italic">{svc.effective_status === 'FULL' ? c('fullyBooked') : c('slotClosed')}</span>
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
      {commissionInfo.services.filter((service) => openedServiceIds.includes(service.id)).map((service) => (
        <CommissionIntakeModal
          key={`${user?.id ?? 'guest'}:${handle}:${service.id}`}
          isOpen={isModalOpen && selectedService?.id === service.id}
          onClose={() => setIsModalOpen(false)}
          service={service}
          policy={policy}
          artistHandle={handle}
          onSuccess={(req) => {
            setIsModalOpen(false);
            // Reset only the submitted form; other-service drafts remain mounted.
            setOpenedServiceIds(ids => ids.filter(id => id !== service.id));
            setSubmittedReq(req);
          }}
        />
      ))}

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
          <StudioFormDialog label={o('createTitle')} onClose={() => setNewScaleModalOpen(false)}
            onSubmit={(e) => {
              e.preventDefault();
              if (createScaleMutation.isPending) return;
              if (!newScaleTitle.trim()) {
                alert(o('titleRequired'));
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
                {' '}{o('createTitle')}{' '}</h3>
              <button
                type="button"
                onClick={() => setNewScaleModalOpen(false)}
                aria-label={o('close')}
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
                    {' '}{o('title')}{' '}<span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="input-new-scale-title-public"
                    aria-label={o('title')} value={newScaleTitle}
                    onChange={(e) => setNewScaleTitle(e.target.value)}
                    placeholder={o('titlePlaceholder')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">{o('category')}</label>
                  <input
                    type="text"
                    data-testid="input-new-scale-category-public"
                    aria-label={o('category')} value={newScaleCategory}
                    onChange={(e) => setNewScaleCategory(e.target.value)}
                    placeholder={o('categoryPlaceholder')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-300 font-bold block mb-1">
                  {' '}{o('description')}{' '}</label>
                <textarea
                  rows={2}
                  data-testid="input-new-scale-description-public"
                  aria-label={o('description')} value={newScaleDescription}
                  onChange={(e) => setNewScaleDescription(e.target.value)}
                  placeholder={o('descriptionPlaceholder')}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    {' '}{o('price')}{' '}<span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="number" step="0.01"
                    min={1}
                    required
                    data-testid="input-new-scale-price-public"
                    aria-label={o('price')} value={newScaleBasePrice}
                    onChange={(e) => setNewScaleBasePrice(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    {' '}{o('days')}{' '}</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    data-testid="input-new-scale-days-public"
                    aria-label={o('days')} value={newScaleEstimatedDays}
                    onChange={(e) => setNewScaleEstimatedDays(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    {' '}{o('slots')}{' '}</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    data-testid="input-new-scale-slots-public"
                    aria-label={o('slots')} value={newScaleMaxSlots}
                    onChange={(e) => setNewScaleMaxSlots(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    {' '}{o('availability')}{' '}</label>
                  <select
                    aria-label={o('availability')} value={newScaleIsOpen ? 'OPEN' : 'CLOSED'}
                    onChange={(e) => setNewScaleIsOpen(e.target.value === 'OPEN')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="OPEN">{o('open')}</option>
                    <option value="CLOSED">{o('closed')}</option>
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
                {' '}{o('cancel')}{' '}</button>
              <button
                type="submit"
                data-testid="btn-submit-new-scale-public"
                disabled={!newScaleTitle.trim() || createScaleMutation.isPending}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {createScaleMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {' '}{o('creating')}{' '}</>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> {' '}{o('create')}{' '}</>
                )}
              </button>
            </div>
          </StudioFormDialog>
        </div>,
        document.body
      )}
    </div>
  );
}
