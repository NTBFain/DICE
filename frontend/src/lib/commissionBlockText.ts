import type { FormBlock } from '@/types/commission';

// Recognize platform defaults while preserving custom artist-authored text.
const labels: Record<string, { en: { title: string; description: string }; th: { title: string; description: string } }> = {
  "CHARACTER_COUNT": {
    "th": {
      "title": "จำนวนตัวละครในภาพ (Character Count)",
      "description": "จำกัดจำนวนตัวละครสูงสุด และคิดราคาเพิ่มเป็น % ต่อตัวละครเสริม"
    },
    "en": {
      "title": "Character count",
      "description": "Limit the number of characters and set the percentage fee for each additional character."
    }
  },
  "SCOPE_EXCLUSIONS": {
    "th": {
      "title": "ข้อจำกัดที่ไม่รับวาด (Scope Exclusions)",
      "description": "บังคับให้ผู้จ้างอ่านและกดยอมรับว่าผลงานไม่มีองค์ประกอบเหล่านี้"
    },
    "en": {
      "title": "Scope exclusions",
      "description": "Require clients to read and acknowledge work you do not offer."
    }
  },
  "POSE_EXPRESSION": {
    "th": {
      "title": "ตัวเลือกท่าทางและอารมณ์ตัวละคร (Pose & Expression)",
      "description": "ให้ผู้จ้างเลือกความต้องการของท่าทางและสีหน้า"
    },
    "en": {
      "title": "Pose & expression",
      "description": "Let clients choose a pose and expression preference."
    }
  },
  "CANVAS_SPECS": {
    "th": {
      "title": "ขนาดและสัดส่วนแคนวาส (Canvas Specs)",
      "description": "ตัวเลือกสัดส่วนภาพที่เปิดให้ผู้จ้างเลือก"
    },
    "en": {
      "title": "Canvas specifications",
      "description": "Offer the canvas sizes and ratios clients can request."
    }
  },
  "BACKGROUND_TIER": {
    "th": {
      "title": "ระดับความละเอียดฉากหลัง (Background Complexity)",
      "description": "แบ่งระดับฉากหลังและคิดราคาเพิ่มตามความยาก"
    },
    "en": {
      "title": "Background complexity",
      "description": "Set background tiers and their additional prices."
    }
  },
  "RUSH_MODE": {
    "th": {
      "title": "งานเร่งด่วน (Rush Order Mode)",
      "description": "คิดค่าบริการเร่งด่วนพิเศษเป็น % ของราคาพื้นฐาน"
    },
    "en": {
      "title": "Rush delivery",
      "description": "Set expedited delivery options and percentage fees."
    }
  },
  "PRIVACY_NDA": {
    "th": {
      "title": "ค่าสัญญาปิดเป็นความลับ / NDA (Privacy Option)",
      "description": "คิดค่าธรรมเนียมสำหรับการห้ามโพสต์ผลงานก่อนวันเปิดตัว"
    },
    "en": {
      "title": "Privacy & NDA",
      "description": "Set a fee for keeping work private until the client permits publication."
    }
  },
  "CUSTOM_QUESTIONS": {
    "th": {
      "title": "คำถามพิเศษเพิ่มเติม (Custom Free-form Questions)",
      "description": "เพิ่มคำถามเฉพาะสำหรับสเกลนี้ เช่น โทนสี Mood & Tone หรือไฟล์ที่ต้องการ"
    },
    "en": {
      "title": "Custom questions",
      "description": "Ask for additional details such as preferred colors or delivery formats."
    }
  }
};

export function getCommissionBlockText(block: Pick<FormBlock, 'type' | 'title' | 'description'>, locale: string, field: 'title' | 'description' = 'title'): string {
  const known = labels[block.type];
  const text = block[field];
  if (!known) return text || (field === 'title' ? block.type : '');
  if (text && text !== known.en[field] && text !== known.th[field]) return text;
  return known[locale === 'th' ? 'th' : 'en'][field];
}

// Localize recognized platform option text without changing stored selection values.
const optionDefaults = [
  {en:'Square (1:1)', th:'สี่เหลี่ยมจัตุรัส (1:1)'},
  {en:'Portrait (9:16)', th:'แนวตั้ง (9:16)'},
  {en:'Landscape (16:9)', th:'แนวนอน (16:9)'},
  {en:'A4 / Printable', th:'A4 / สำหรับพิมพ์'},
  {
    "th": "ไม่รับชุดเกราะซับซ้อน / หุ่นยนต์ Mecha",
    "en": "No complex armor or mecha"
  },
  {
    "th": "ไม่รับสัตว์เลี้ยงหรือสิ่งมีชีวิตเสริม",
    "en": "No pets or additional creatures"
  },
  {
    "th": "ไม่รับฉากสถาปัตยกรรมเมืองแบบละเอียด",
    "en": "No detailed city architecture"
  },
  {
    "th": "ศิลปินออกแบบท่าทางให้อิสระ (Free Pose)",
    "en": "Artist chooses the pose (Free Pose)"
  },
  {
    "th": "ระบุท่าทางเฉพาะเจาะจง (Custom Pose)",
    "en": "Specify a pose (Custom Pose)"
  },
  {
    "th": "วาดอิงตามแบบภาพ Reference เป๊ะๆ",
    "en": "Follow the reference pose closely"
  },
  {
    "th": "1:1 Square (โปรไฟล์ / โซเชียล)",
    "en": "1:1 Square (profile / social media)"
  },
  {
    "th": "9:16 Story / มือถือ Wallpaper",
    "en": "9:16 Story / mobile wallpaper"
  },
  {
    "th": "16:9 Desktop Wallpaper / หน้าปกยูทูป",
    "en": "16:9 Desktop wallpaper / YouTube cover"
  },
  {
    "th": "A4 Print 300 DPI (พิมพ์คมชัด)",
    "en": "A4 Print 300 DPI (high-resolution print)"
  },
  {
    "th": "พื้นใส PNG / สีพื้นไล่เฉด",
    "en": "Transparent PNG / solid or gradient color"
  },
  {
    "th": "ลวดลายกราฟิก / พร็อพประกอบง่ายๆ",
    "en": "Graphic patterns / simple props"
  },
  {
    "th": "ฉากสภาพแวดล้อมเต็มรูปแบบ (Full Scenic)",
    "en": "Full scenic environment"
  },
  {
    "th": "ไม่นำภาพไปโพสต์โปรโมทจนกว่าผู้จ้างจะอนุญาต",
    "en": "Do not publish this work until the client permits it."
  },
  {
    "th": "Mood & Tone หรือโทนสีหลักที่ต้องการ",
    "en": "Preferred mood, tone and main colors"
  }
];

export function getCommissionOptionText(text: string, locale: string): string {
  const known = optionDefaults.find(option => option.en === text || option.th === text);
  return known ? known[locale === 'th' ? 'th' : 'en'] : text;
}
