# 🎲 DICE Platform (Multi-Artist Marketplace Platform)

ศูนย์กลางแพลตฟอร์มการค้าและประมูลผลงานศิลปะ 2D (Multi-Artist Marketplace Platform) สำหรับศิลปินฟรีแลนซ์ 2D Character Designers, VTuber Riggers, และ Content Creators

**Target Audience:** นักสะสมภาพ, VTubers, Game Developers, Content Creators, และศิลปินฟรีแลนซ์

---

## 📐 Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Vanilla CSS (Theme Variables), TanStack Query v5, next-intl |
| Backend | FastAPI (Python), SQLModel, Uvicorn, Pillow (Watermarking) |
| Database | SQLite (WAL High-Speed Mode) — ฐานข้อมูลจริง 100% |
| Real-time | WebSockets (FastAPI ConnectionManager) |

---

## 📚 เอกสารประกอบการพัฒนา (Documentation)

เอกสารทั้งหมดอยู่ในโฟลเดอร์ `docs/`:

| ไฟล์ | คำอธิบาย |
|------|---------|
| [PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | สรุปสถานะระบบย่อยทั้ง 12 โมดูล พร้อมเปอร์เซ็นต์ Backend/Frontend |
| [CHANGELOG_SUMMARY.md](docs/CHANGELOG_SUMMARY.md) | สรุปประวัติการแก้ไขและฟีเจอร์ล่าสุด |
| [DESIGN.md](docs/DESIGN.md) | Design System, Dynamic Theme Engine, และ Design Tokens |
| [Flat_Design.md](docs/Flat_Design.md) | Gallery Grid / Editorial Flat Design Specification |
| [SYSTEM_REQUIREMENTS.md](docs/SYSTEM_REQUIREMENTS.md) | Functional Requirements สำหรับ 9 โมดูลหลัก |
| [THESIS_CHAPTER_1.md](docs/THESIS_CHAPTER_1.md) | บทที่ 1 บทนำ (Introduction) |
| [THESIS_CHAPTER_1_MODULES.md](docs/THESIS_CHAPTER_1_MODULES.md) | บทที่ 1 แบบแยก 6 Subsystems |
| [THESIS_PROPOSAL.md](docs/THESIS_PROPOSAL.md) | ข้อเสนอโครงงาน (Full Proposal) |
| [THESIS_PROPOSAL_SHORT.md](docs/THESIS_PROPOSAL_SHORT.md) | ข้อเสนอโครงงานแบบย่อ |

---

## 🚀 การรันโปรเจกต์ (Quick Start)

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
