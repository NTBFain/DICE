# 🎲 DICE Platform (Multi-Artist Marketplace Platform)

ศูนย์กลางแพลตฟอร์มการค้าและประมูลผลงานศิลปะ 2D (Multi-Artist Marketplace Platform) สำหรับศิลปินฟรีแลนซ์ 2D Character Designers, VTuber Riggers, และ Content Creators

**Target Audience:** นักสะสมภาพ, VTubers, Game Developers, Content Creators, และศิลปินฟรีแลนซ์

---

## 🏗️ โครงสร้างและการแยกโปรเจกต์ (Project Separation)

1. 🎲 **`Dice` (`C:\Users\fainl\Desktop\Dice`):** แพลตฟอร์มกลางศูนย์รวมหลายศิลปิน (Multi-Artist Marketplace Platform) รองรับการลงทะเบียนศิลปินใหม่เข้าฐานข้อมูลจริง คลังค้นหาศิลปิน และหน้าโปรไฟล์ส่วนตัวศิลปินแต่ละท่าน
2. 🎨 **`FFF_Projrct` (`C:\Users\fainl\Desktop\FFF_Projrct`):** แม่แบบเว็บประจำตัวสำหรับศิลปินเดี่ยว (Single-Artist Dedicated Atelier Studio Website Template)

---

## 📐 Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Vanilla CSS (Theme Variables), TanStack Query v5, next-intl |
| Backend | FastAPI (Python), SQLModel, Uvicorn, Pillow (Watermarking) |
| Database | SQLite (WAL High-Speed Mode) — ฐานข้อมูลจริง 100% |
| Real-time | WebSockets |

---

## 📚 เอกสารประกอบการพัฒนา (Documentation)

เอกสารทั้งหมดอยู่ในโฟลเดอร์ `docs/`:

| ไฟล์ | คำอธิบาย |
|------|---------|
| [PROJECT_INDEX.md](docs/PROJECT_INDEX.md) | คู่มือเทคนิคเชิงลึกและสารบัญฟังก์ชันระบบทั้งหมด |
| [PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | สรุปสถานะระบบสมัครสมาชิกศิลปิน และโมดูลที่เปิดใช้งาน |
| [DATABASE_ERD.md](docs/DATABASE_ERD.md) | ผังความสัมพันธ์ฐานข้อมูลจริง (`User`, `ArtistProfile`, `ArtistService`, `Order`, `Auction`) |
| [IMPLEMENTED_MODULES.md](docs/IMPLEMENTED_MODULES.md) | รายละเอียดโมดูลระบบหลายศิลปินและการลงทะเบียน DB จริง |
| [PROPOSED_MODULES.md](docs/PROPOSED_MODULES.md) | แผนพัฒนา Dashboard บริหารสตูดิโอส่วนตัวของศิลปิน |
| [ROADMAP.md](docs/ROADMAP.md) | แผนพัฒนา และแนวทางป้องกันปัญหาคอมพิวเตอร์ค้าง |
| [CHANGELOG_SUMMARY.md](docs/CHANGELOG_SUMMARY.md) | สรุปประวัติการแก้ไขและฟีเจอร์ล่าสุด |
| [DESIGN.md](docs/DESIGN.md) | Design System, Dynamic Theme Engine, และ Design Tokens |

---

## 🚀 การรันโปรเจกต์ (Quick Start & Safe Execution)

> [!TIP]
> เพื่อความเสถียร ประหยัด CPU/RAM และป้องกันปัญหาเครื่องคอมพิวเตอร์ค้าง แนะนำให้รัน Frontend ในโหมด **Production Mode (`npx next start`)**

**1. รัน Backend FastAPI (Port 8000):**
```bash
cd backend
uv run uvicorn main:app --port 8000
```

**2. บิลด์และรัน Frontend Next.js (Port 3000):**
```bash
cd frontend
npx next build
npx next start -p 3000
```

---

## 👤 Default Accounts & Registration
* **หน้าลงทะเบียนศิลปินใหม่ (Real DB):** `http://localhost:3000/th/artists/register`
* **Default Admin/Artist:** `admin@example.com` / `password123`
* **Default Client:** `client@example.com` / `password123`
