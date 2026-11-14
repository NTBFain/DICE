import { getCommissionOptionText } from './commissionBlockText';

export type CommissionBrief = {
  character_name: string; usage_type: string; brief: string; canvas_size: string;
  requested_deadline?: string | null; reference_links?: string | null;
  custom_responses?: Record<string, any>; addons_snapshot: { name: string; price_type: string; price_value: number }[];
  base_price_snapshot: number; total_price: number; tos_snapshot: string; tos_version: number;
};
const words = {
  en: {character:'Character',brief:'Creative brief',usage:'Usage license',canvas:'Canvas',deadline:'Requested deadline',references:'Reference links',characters:'Character count',scope:'Scope exclusions acknowledged',pose:'Pose & expression',background:'Background',rush:'Rush delivery',privacy:'Keep work private (NDA)',additional:'Additional answer',addon:'Add-on',base:'Base price at submission',total:'Total at submission',terms:'Agreed artist terms',yes:'Yes',no:'No',days:'days',version:'version',personal:'Personal use',streaming:'Streaming / VTuber',commercial:'Commercial merchandise'},
  th: {character:'ชื่อตัวละคร',brief:'รายละเอียดงาน',usage:'สิทธิ์การใช้งาน',canvas:'ขนาดภาพ',deadline:'กำหนดส่งที่ขอ',references:'ลิงก์อ้างอิง',characters:'จำนวนตัวละคร',scope:'ยอมรับข้อจำกัดงาน',pose:'ท่าทางและสีหน้า',background:'ฉากหลัง',rush:'งานเร่งด่วน',privacy:'เก็บงานเป็นความลับ (NDA)',additional:'คำตอบเพิ่มเติม',addon:'ตัวเลือกเสริม',base:'ราคาพื้นฐาน ณ วันที่ส่ง',total:'ราคารวม ณ วันที่ส่ง',terms:'เงื่อนไขศิลปินที่ยอมรับ',yes:'ใช่',no:'ไม่',days:'วัน',version:'เวอร์ชัน',personal:'ใช้ส่วนบุคคล',streaming:'สตรีมมิง / VTuber',commercial:'สินค้าเชิงพาณิชย์'},
};
export function briefWords(locale: string) { return words[locale === 'th' ? 'th' : 'en']; }
export function usageText(value: string, locale: string): string {
  const w=briefWords(locale);
  return ({PERSONAL:w.personal,STREAMING:w.streaming,COMMERCIAL:w.commercial,COMMERCIAL_STREAMING:w.streaming,COMMERCIAL_MERCH:w.commercial} as Record<string,string>)[value] || value;
}
export function commissionBriefRows(brief: CommissionBrief, locale: string): {label:string;value:string}[] {
  const w=briefWords(locale), rows:{label:string;value:string}[]=[];
  const option=(value:string)=>getCommissionOptionText(value,locale);
  const text=(value:any):string=>typeof value==='boolean' ? (value?w.yes:w.no) : Array.isArray(value) ? value.map(text).join(', ') : value && typeof value==='object' ? Object.values(value).map(text).join(', ') : String(value ?? '');
  const add=(label:string,value:any)=>{if(value!==undefined && value!==null && value!=='')rows.push({label,value:text(value)});};
  const money=(value:number)=>new Intl.NumberFormat(locale==='th'?'th-TH':'en-US',{style:'currency',currency:'THB',minimumFractionDigits:2}).format(value);
  add(w.character,brief.character_name);add(w.brief,brief.brief);add(w.usage,usageText(brief.usage_type,locale));
  add(w.canvas,option(brief.canvas_size));
  // This stored ISO midnight is a calendar marker, not an instant to shift by device timezone.
  add(w.deadline,brief.requested_deadline?.slice(0,10));add(w.references,brief.reference_links);
  const c=brief.custom_responses || {};
  add(w.characters,c.character_count);add(w.scope,c.scope_exclusions_acknowledged);
  if(c.pose_expression)add(w.pose,option(text(c.pose_expression)));
  if(c.background_tier)add(w.background,option(text(c.background_tier.label ?? c.background_tier)));
  if(c.rush_order)add(w.rush,`${c.rush_order.days} ${w.days}${c.rush_order.percent!==undefined ? ` (+${c.rush_order.percent}%)` : ''}`);
  add(w.privacy,c.privacy_nda);
  Object.entries(c.custom_answers || {}).forEach(([id,answer],index)=>{
    const saved=c.custom_question_labels?.[id];
    add(typeof saved==='string' && saved.trim()?saved:`${w.additional} ${index+1}`,answer);
  });
  // Retain unknown historical answers without exposing machine keys as question wording.
  const known=new Set(['character_count','scope_exclusions_acknowledged','pose_expression','canvas_spec','background_tier','rush_order','privacy_nda','custom_answers','custom_question_labels']);
  Object.entries(c).filter(([key])=>!known.has(key)).forEach(([,value],index)=>add(`${w.additional} (${index+1})`,value));
  add(w.base,money(brief.base_price_snapshot));
  brief.addons_snapshot?.forEach(addon=>add(`${w.addon}: ${addon.name}`,addon.price_type==='PERCENTAGE'?`${addon.price_value}%`:money(addon.price_value)));
  add(w.total,money(brief.total_price));return rows;
}
