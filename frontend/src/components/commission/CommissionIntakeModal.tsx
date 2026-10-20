'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CommissionServiceDetail,
  CommissionPolicy,
  CommissionRequest,
  ServiceAddon,
  FormBlock,
} from '@/types/commission';
import { submitCommissionRequest } from '@/lib/commissionApi';
import {
  X,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Loader2,
  DollarSign,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Users,
  ShieldAlert,
  Zap,
  Lock,
  Layers,
  HelpCircle,
  Smile,
  Check,
} from 'lucide-react';

interface CommissionIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: CommissionServiceDetail;
  policy: CommissionPolicy | null;
  artistHandle: string;
  onSuccess: (request: CommissionRequest) => void;
}

export default function CommissionIntakeModal({
  isOpen,
  onClose,
  service,
  policy,
  artistHandle,
  onSuccess,
}: CommissionIntakeModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form Blocks Map
  const blocksMap = useMemo(() => {
    const map = new Map<string, FormBlock>();
    if (service.form_schema) {
      service.form_schema.forEach((b) => {
        if (b.enabled) map.set(b.type, b);
      });
    }
    return map;
  }, [service.form_schema]);

  const charBlock = blocksMap.get('CHARACTER_COUNT');
  const scopeBlock = blocksMap.get('SCOPE_EXCLUSIONS');
  const poseBlock = blocksMap.get('POSE_EXPRESSION');
  const canvasBlock = blocksMap.get('CANVAS_SPECS');
  const bgBlock = blocksMap.get('BACKGROUND_TIER');
  const rushBlock = blocksMap.get('RUSH_MODE');
  const ndaBlock = blocksMap.get('PRIVACY_NDA');
  const customQBlock = blocksMap.get('CUSTOM_QUESTIONS');

  // Form State
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  const [usageType, setUsageType] = useState<string>('PERSONAL');
  const [characterName, setCharacterName] = useState<string>('');
  const [brief, setBrief] = useState<string>('');
  const [canvasSize, setCanvasSize] = useState<string>(
    canvasBlock?.config?.allowed_ratios?.[0] || 'Square (1:1)'
  );
  const [deadline, setDeadline] = useState<string>('');
  const [refLinks, setRefLinks] = useState<string>('');
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [agreedToTos, setAgreedToTos] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Modular custom responses state
  const [characterCount, setCharacterCount] = useState<number>(1);
  const [scopeExclusionsAck, setScopeExclusionsAck] = useState<boolean>(false);
  const [poseExpression, setPoseExpression] = useState<string>(
    poseBlock?.config?.options?.[0] || ''
  );
  const [selectedBgTier, setSelectedBgTier] = useState<any>(
    bgBlock?.config?.tiers?.[0] || null
  );
  const [selectedRushRate, setSelectedRushRate] = useState<any>(null);
  const [isNdaSelected, setIsNdaSelected] = useState<boolean>(false);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  if (!isOpen || typeof document === 'undefined') return null;

  // Real-time price calculation matching server formula
  const basePrice = service.base_price;
  let fixedSum = 0;
  let pctSum = 0;

  // 1. Standard Add-ons
  service.addons.forEach((ad) => {
    if (selectedAddonIds.includes(ad.id)) {
      if (ad.price_type === 'FIXED') {
        fixedSum += ad.price_value;
      } else if (ad.price_type === 'PERCENTAGE') {
        pctSum += ad.price_value;
      }
    }
  });

  // 2. Extra Characters (% of base)
  let extraCharPct = 0;
  if (charBlock && characterCount > 1) {
    const extra = characterCount - 1;
    const rate = Number(charBlock.config?.extra_price_percent ?? 70);
    extraCharPct = extra * rate;
    pctSum += extraCharPct;
  }

  // 3. Background Tier
  let bgFee = 0;
  if (bgBlock && selectedBgTier) {
    bgFee = Number(selectedBgTier.price || 0);
    fixedSum += bgFee;
  }

  // 4. Rush Rate (% of base)
  let rushPct = 0;
  if (rushBlock && selectedRushRate) {
    rushPct = Number(selectedRushRate.percent || 0);
    pctSum += rushPct;
  }

  // 5. NDA Fee (Fixed)
  let ndaFee = 0;
  if (ndaBlock && isNdaSelected) {
    ndaFee = Number(ndaBlock.config?.price || 500);
    fixedSum += ndaFee;
  }

  const estimatedTotal = Math.round(basePrice + fixedSum + (basePrice * pctSum) / 100);
  const depositPct = policy?.deposit_percent ?? 50;
  const initialDeposit = Math.round(estimatedTotal * (depositPct / 100));

  const handleToggleAddon = (addonId: number) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      if (refFiles.length + filesArr.length > 5) {
        alert('อัปโหลดไฟล์ภาพอ้างอิงได้สูงสุด 5 รูป');
        return;
      }
      setRefFiles((prev) => [...prev, ...filesArr].slice(0, 5));
    }
  };

  const handleRemoveFile = (index: number) => {
    setRefFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTos) {
      setErrorMsg('กรุณายอมรับเงื่อนไขสัญญา TOS ก่อนส่งคำขอ');
      return;
    }
    if (scopeBlock && !scopeExclusionsAck) {
      setErrorMsg('กรุณากดยืนยันว่าคำขอของท่านไม่มีรายการงานที่ไม่รับวาด');
      return;
    }
    if (!characterName.trim() || !brief.trim()) {
      setErrorMsg('กรุณากรอกชื่อตัวละครและรายละเอียดบรีฟ');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const customResponsesPayload: Record<string, any> = {};
      if (charBlock) customResponsesPayload.character_count = characterCount;
      if (scopeBlock) customResponsesPayload.scope_exclusions_acknowledged = true;
      if (poseBlock && poseExpression) customResponsesPayload.pose_expression = poseExpression;
      if (canvasBlock) customResponsesPayload.canvas_spec = canvasSize;
      if (bgBlock && selectedBgTier) customResponsesPayload.background_tier = selectedBgTier;
      if (rushBlock && selectedRushRate) customResponsesPayload.rush_order = selectedRushRate;
      if (ndaBlock) customResponsesPayload.privacy_nda = isNdaSelected;
      if (customQBlock) customResponsesPayload.custom_answers = customAnswers;

      const payload = {
        service_id: service.id,
        character_name: characterName.trim(),
        usage_type: usageType,
        brief: brief.trim(),
        canvas_size: canvasSize,
        requested_deadline: deadline ? new Date(deadline).toISOString() : null,
        reference_links: refLinks.trim() || null,
        addon_ids: selectedAddonIds,
        custom_responses: customResponsesPayload,
        agreed_to_tos: agreedToTos,
      };

      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      refFiles.forEach((file) => {
        formData.append('reference_files', file);
      });

      const result = await submitCommissionRequest(formData);
      onSuccess(result);
    } catch (err: any) {
      console.error('Failed to submit commission request:', err);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setErrorMsg(detail.map((d: any) => d.msg || JSON.stringify(d)).join(', '));
      } else if (typeof detail === 'string') {
        setErrorMsg(detail);
      } else {
        setErrorMsg('เกิดข้อผิดพลาดในการส่งคำขอ กรุณาตรวจสอบข้อมูลอีกครั้ง');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-3xl w-full shadow-2xl relative max-h-[88vh] flex flex-col overflow-hidden">
        {/* Fixed Header & Stepper */}
        <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-900/95 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                {service.category} • @{artistHandle}
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white">
                ส่งบรีฟ: {service.title}
              </h2>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                รวม ฿{estimatedTotal.toLocaleString()} ({service.estimated_days} วัน)
              </span>
            </div>
            <button
              onClick={onClose}
              data-testid="close-intake-modal"
              aria-label="Close"
              className="text-neutral-400 hover:text-white p-1.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Progress */}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-800/80 text-xs font-bold">
            <div className={`flex items-center gap-1.5 ${currentStep >= 1 ? 'text-blue-400' : 'text-neutral-500'}`}>
              <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">1</span>
              <span>ออปชัน &amp; ขอบเขต</span>
            </div>
            <div className={`h-0.5 flex-1 mx-2.5 ${currentStep >= 2 ? 'bg-blue-500' : 'bg-neutral-800'}`} />
            <div className={`flex items-center gap-1.5 ${currentStep >= 2 ? 'text-blue-400' : 'text-neutral-500'}`}>
              <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">2</span>
              <span>บรีฟ &amp; สเปกงาน</span>
            </div>
            <div className={`h-0.5 flex-1 mx-2.5 ${currentStep >= 3 ? 'bg-blue-500' : 'bg-neutral-800'}`} />
            <div className={`flex items-center gap-1.5 ${currentStep >= 3 ? 'text-blue-400' : 'text-neutral-500'}`}>
              <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">3</span>
              <span>สัญญา TOS &amp; สรุปยอด</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3.5 space-y-3 text-xs">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: OPTIONS, CHARACTER COUNT, BACKGROUND, ADDONS */}
          {currentStep === 1 && (
            <div className="space-y-3">
              {/* Character Count Block */}
              {charBlock && (
                <div className="space-y-1.5 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      จำนวนตัวละครในภาพ (Character Count):
                    </label>
                    <span className="text-emerald-400 font-bold text-xs">
                      {characterCount > 1
                        ? `+${extraCharPct}% (+฿${Math.round((basePrice * extraCharPct) / 100).toLocaleString()})`
                        : '1 ตัวละคร (รวมในราคาฐาน)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: charBlock.config?.max_chars || 4 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCharacterCount(n)}
                        className={`py-1.5 px-2 rounded-xl font-bold text-xs border transition cursor-pointer ${
                          characterCount === n
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {n} ตัว {n > 1 && <span className="text-[10px] opacity-80">(+{((n - 1) * (charBlock.config?.extra_price_percent || 70))}%)</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Background Tier Block */}
              {bgBlock && bgBlock.config?.tiers && (
                <div className="space-y-1.5">
                  <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    ระดับความละเอียดฉากหลัง (Background Complexity):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {bgBlock.config.tiers.map((t: any, idx: number) => {
                      const isSelected = selectedBgTier?.label === t.label;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedBgTier(t)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition text-left flex flex-col justify-between ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 text-white'
                              : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <span className="font-semibold text-xs leading-snug">{t.label}</span>
                          <span className="text-emerald-400 font-bold mt-1">
                            {t.price > 0 ? `+฿${t.price.toLocaleString()}` : 'ฟรี (Free)'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rush Mode & NDA side by side if enabled */}
              {(rushBlock || ndaBlock) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {rushBlock && rushBlock.config?.rates && (
                    <div className="space-y-1.5 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                      <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                        งานเร่งด่วน (Rush Order):
                      </label>
                      <div className="grid grid-cols-1 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRushRate(null)}
                          className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                            selectedRushRate === null
                              ? 'border-yellow-500 bg-yellow-500/10 text-white font-bold'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                          }`}
                        >
                          เวลาปกติ ({service.estimated_days} วัน)
                        </button>
                        {rushBlock.config.rates.map((r: any, idx: number) => {
                          const isSelected = selectedRushRate?.days === r.days;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedRushRate(r)}
                              className={`p-2 rounded-lg border text-left cursor-pointer transition flex items-center justify-between ${
                                isSelected
                                  ? 'border-yellow-500 bg-yellow-500/10 text-white font-bold'
                                  : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                              }`}
                            >
                              <span>ด่วน {r.days} วัน</span>
                              <span className="text-yellow-400 font-bold">+{r.percent}%</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {ndaBlock && (
                    <div
                      onClick={() => setIsNdaSelected(!isNdaSelected)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        isNdaSelected
                          ? 'border-purple-500 bg-purple-500/10 text-white'
                          : 'border-neutral-800 bg-neutral-950/60 text-neutral-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-white block text-xs">
                            สัญญาปิดเป็นความลับ / NDA
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {ndaBlock.config?.description || 'ไม่เผยแพร่ผลงานก่อนอนุญาต'}
                          </span>
                        </div>
                      </div>
                      <span className="text-purple-400 font-bold text-xs">
                        +฿{(ndaBlock.config?.price || 500).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Usage Type Selection */}
              <div className="space-y-1.5">
                <label className="text-neutral-300 font-bold block">วัตถุประสงค์การนำไปใช้ (Usage License):</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'PERSONAL', label: 'ส่วนตัว (Personal Use)', desc: 'รูปโปรไฟล์ / ตั้งจอ' },
                    { id: 'COMMERCIAL_STREAMING', label: 'สตรีมมิ่ง / VTuber', desc: 'Youtube / Twitch' },
                    { id: 'COMMERCIAL_MERCH', label: 'สินค้า (Commercial Merch)', desc: 'พิมพ์ขาย / สินค้าที่ระลึก' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setUsageType(item.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        usageType === item.id
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="font-semibold text-xs">{item.label}</div>
                      <div className="text-[10px] text-neutral-500">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add-ons List (only show if addons exist, or compact single line) */}
              {service.addons.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-neutral-300 font-bold block">
                    ตัวเลือกเสริมพิเศษ (Add-ons):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {service.addons.map((ad) => {
                      const isSelected = selectedAddonIds.includes(ad.id);
                      return (
                        <div
                          key={ad.id}
                          onClick={() => handleToggleAddon(ad.id)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500/10 text-white'
                              : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded text-blue-600"
                            />
                            <span className="font-semibold text-xs">{ad.name}</span>
                          </div>
                          <span className="font-bold text-emerald-400 text-xs">
                            {ad.price_type === 'FIXED' ? `+฿${ad.price_value}` : `+${ad.price_value}%`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SCOPE EXCLUSIONS ACK, BRIEF, POSE, SPECS & REFS */}
          {currentStep === 2 && (
            <div className="space-y-2.5">
              {/* Scope Exclusions Banner (Mandatory acknowledgment) */}
              {scopeBlock && (scopeBlock.config?.exclusions || []).length > 0 && (
                <div className="bg-red-950/30 border border-red-800/60 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>ข้อจำกัดประเภทงานที่ไม่รับวาด:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {scopeBlock.config.exclusions.map((ex: string, exIdx: number) => (
                        <span
                          key={exIdx}
                          className="bg-red-900/40 text-red-300 px-2 py-0.5 rounded-lg text-[11px] font-semibold border border-red-700/50"
                        >
                          🚫 {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-red-900/40">
                    <input
                      type="checkbox"
                      data-testid="scope-ack-checkbox"
                      checked={scopeExclusionsAck}
                      onChange={(e) => setScopeExclusionsAck(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-red-600 cursor-pointer"
                    />
                    <span className="text-red-200 font-bold text-xs">
                      ข้าพเจ้ารับทราบและยืนยันว่า บรีฟงานนี้ไม่มีองค์ประกอบต้องห้ามตามที่ระบุไว้ข้างต้น
                    </span>
                  </label>
                </div>
              )}

              {/* Row 1: Character Name + Canvas Ratio + Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    ชื่อตัวละคร (Character) <span className="text-red-400">*</span>:
                  </label>
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="เช่น Aethelgard, ลูเซียนา..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">สัดส่วนภาพ (Canvas Ratio):</label>
                  <select
                    value={canvasSize}
                    onChange={(e) => setCanvasSize(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500 font-bold"
                  >
                    {(canvasBlock?.config?.allowed_ratios || [
                      'Square (1:1)',
                      'Portrait (9:16)',
                      'Landscape (16:9)',
                      'A4 / Printable',
                    ]).map((r: string, idx: number) => (
                      <option key={idx} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-neutral-300 font-bold block mb-1">วันส่งงานที่ต้องการ (Deadline):</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Pose & Expression Selector (if enabled) */}
              {poseBlock && (poseBlock.config?.options || []).length > 0 && (
                <div className="space-y-1">
                  <label className="text-neutral-300 font-bold flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-pink-400" />
                    ความต้องการท่าทางและสีหน้า (Pose &amp; Expression):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {poseBlock.config.options.map((opt: string, optIdx: number) => {
                      const isSelected = poseExpression === opt;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => setPoseExpression(opt)}
                          className={`p-2 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'border-pink-500 bg-pink-500/10 text-white'
                              : 'border-neutral-800 bg-neutral-950/60 text-neutral-400'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Creative Brief + Ref Links/Upload in a balanced 2-column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-neutral-300 font-bold block mb-1">
                    รายละเอียดบรีฟ (ท่าทาง, สีหน้า, อารมณ์) <span className="text-red-400">*</span>:
                  </label>
                  <textarea
                    rows={3}
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder="อธิบายสิ่งที่ต้องการ เช่น ยิ้มมั่นใจ มือขวาจับดาบ เสื้อคลุมสีน้ำเงิน..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-neutral-300 font-bold block mb-1">
                      ลิงก์อ้างอิง (Google Drive / Pinterest):
                    </label>
                    <input
                      type="url"
                      value={refLinks}
                      onChange={(e) => setRefLinks(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <div className="border border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-950/60 rounded-xl p-2 text-center cursor-pointer relative flex items-center justify-center gap-2">
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <UploadCloud className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span className="text-neutral-300 font-semibold text-[11px]">
                        แนบภาพเรฟเฟอเรนซ์ (สูงสุด 5 รูป)
                      </span>
                    </div>
                    {refFiles.length > 0 && (
                      <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                        {refFiles.map((file, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={URL.createObjectURL(file)}
                              alt="preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors cursor-pointer"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom Questions (if enabled) */}
              {customQBlock && (customQBlock.config?.questions || []).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                  {customQBlock.config.questions.map((q: any) => (
                    <div key={q.id} className="space-y-1">
                      <label className="text-neutral-300 font-semibold block text-xs">
                        {q.label} {q.required && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type="text"
                        value={customAnswers[q.id] || ''}
                        onChange={(e) =>
                          setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })
                        }
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: REVIEW & TOS */}
          {currentStep === 3 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Summary Card */}
                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5">
                  <span className="text-neutral-400 font-bold block">สรุปรายการคำขอจ้างงาน:</span>
                  <div className="flex justify-between text-neutral-300">
                    <span>สเกลงาน: {service.title}</span>
                    <span>฿{basePrice.toLocaleString()}</span>
                  </div>

                  {charBlock && characterCount > 1 && (
                    <div className="flex justify-between text-indigo-400">
                      <span>ตัวละครเสริม ({characterCount - 1} ตัว • +{extraCharPct}%):</span>
                      <span>+฿{Math.round((basePrice * extraCharPct) / 100).toLocaleString()}</span>
                    </div>
                  )}

                  {bgBlock && selectedBgTier && bgFee > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>ฉากหลัง: {selectedBgTier.label}</span>
                      <span>+฿{bgFee.toLocaleString()}</span>
                    </div>
                  )}

                  {rushBlock && selectedRushRate && (
                    <div className="flex justify-between text-yellow-400">
                      <span>งานเร่งด่วน ({selectedRushRate.days} วัน • +{rushPct}%):</span>
                      <span>+฿{Math.round((basePrice * rushPct) / 100).toLocaleString()}</span>
                    </div>
                  )}

                  {ndaBlock && isNdaSelected && (
                    <div className="flex justify-between text-purple-400">
                      <span>สัญญาไม่เปิดเผยผลงาน (NDA):</span>
                      <span>+฿{ndaFee.toLocaleString()}</span>
                    </div>
                  )}

                  {selectedAddonIds.length > 0 && (
                    <div className="flex justify-between text-neutral-400">
                      <span>ตัวเลือกเสริม ({selectedAddonIds.length} รายการ):</span>
                      <span>+฿{service.addons.filter(a => selectedAddonIds.includes(a.id)).reduce((acc, a) => acc + (a.price_type === 'FIXED' ? a.price_value : (basePrice * a.price_value / 100)), 0).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-neutral-800 flex justify-between items-baseline font-bold">
                    <span className="text-white text-sm">ราคารวมประเมิน:</span>
                    <span className="text-emerald-400 text-base">฿{estimatedTotal.toLocaleString()}</span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    * มัดจำงวดแรก {depositPct}% = <span className="text-neutral-200 font-bold">฿{initialDeposit.toLocaleString()}</span>
                  </div>
                </div>

                {/* TOS Box */}
                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5 max-h-44 overflow-y-auto">
                  <span className="text-neutral-300 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-400" /> ข้อตกลงสัญญาของศิลปิน (TOS):
                  </span>
                  <p className="text-neutral-400 leading-relaxed whitespace-pre-wrap text-[11px]">
                    {policy?.terms_of_service || 'ศิลปินใช้ข้อตกลงมาตรฐานของแพลตฟอร์ม DICE'}
                  </p>
                  {policy?.refund_policy && (
                    <div className="pt-1.5 border-t border-neutral-800 text-neutral-400 text-[11px]">
                      <span className="font-bold text-neutral-300 block">นโยบายการคืนเงิน:</span>
                      {policy.refund_policy}
                    </div>
                  )}
                </div>
              </div>

              {/* No-AI Notice & Checkbox */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-center gap-2 text-emerald-400">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <span>ผลงานที่ส่งมอบได้รับการคุ้มครองลิขสิทธิ์ และห้ามนำไปใช้เทรนโมเดล AI ทุกกรณี</span>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  data-testid="tos-checkbox"
                  checked={agreedToTos}
                  onChange={(e) => setAgreedToTos(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                />
                <span className="text-neutral-300 font-semibold">
                  ข้าพเจ้ายืนยันว่าได้อ่านและยอมรับเงื่อนไขสัญญาของศิลปินฉบับนี้อย่างครบถ้วน
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Fixed Footer Actions */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-900/95 shrink-0 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> ย้อนกลับ
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 2) {
                  if (scopeBlock && !scopeExclusionsAck) {
                    setErrorMsg('กรุณากดยืนยันว่าคำขอของท่านไม่มีรายการงานที่ไม่รับวาด');
                    return;
                  }
                  if (!characterName.trim() || !brief.trim()) {
                    setErrorMsg('กรุณากรอกชื่อตัวละครและรายละเอียดบรีฟก่อนไปต่อ');
                    return;
                  }
                }
                setErrorMsg('');
                setCurrentStep((prev) => (prev + 1) as any);
              }}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
            >
              ถัดไป <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !agreedToTos}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังส่งบรีฟ...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  ยืนยันส่งคำขอจ้างงาน
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
