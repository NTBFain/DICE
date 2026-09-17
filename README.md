# DICE

**DICE (Freelance Art Commission & Live Auction Management Platform)**  
เว็บแพลตฟอร์มศูนย์กลางสำหรับการซื้อขาย คอมมิชชัน และประมูลผลงานศิลปะดิจิทัล ออกแบบมาสำหรับศิลปินฟรีแลนซ์ นักวาด 2D Character และ VTuber Rigger โดยเฉพาะ ครอบคลุมทั้งการจัดการคิวงาน ระบบแบ่งชำระเป็นงวด ระบบประมูลแบบเรียลไทม์ และระบบป้องกันลิขสิทธิ์ภาพตัวอย่าง

---

## ที่มาและปัญหาที่แก้ไข (Background & Motivation)

การซื้อขายและจ้างงานศิลปะดิจิทัลในปัจจุบันมักดำเนินผ่านโซเชียลมีเดีย เช่น Facebook, X (Twitter) หรือ Discord ซึ่งมักพบปัญหาสำคัญหลายประการ:
- **ปัญหาการทิ้งคิวและเบี้ยวงาน:** ขาดระบบติดตามสถานะงานที่ชัดเจนระหว่างผู้จ้างและศิลปิน
- **ปัญหาการละเมิดลิขสิทธิ์:** การส่งไฟล์ตัวอย่างให้ตรวจผ่านแชทมักไม่มีการใส่ลายน้ำที่รัดกุม ทำให้ภาพร่างถูกนำไปใช้งานก่อนชำระเงินครบถ้วน
- **การประมูลที่ไร้มาตรฐาน:** การประมูลผ่านช่องคอมเมนต์มักเกิดปัญหาเสนอราคาชนกัน การลบคอมเมนต์ หรือปัญหา Sniping ในวินาทีสุดท้ายโดยไม่มีการทดเวลา

DICE จึงถูกพัฒนาขึ้นเพื่อเป็นแพลตฟอร์มกลางที่รวมกระบวนการทั้งหมดไว้ในที่เดียว ตั้งแต่การแสดงพอร์ตโฟลิโอ การประมูลแบบเรียลไทม์ การจัดการคิวงานคอมมิชชัน การแบ่งชำระเงินตามงวดงาน และการส่งมอบไฟล์ความละเอียดสูงอัตโนมัติ

---

## ฟีเจอร์หลักของระบบ (Core Features)

### 1. ระบบประมูลผลงานแบบเรียลไทม์ (Live Auction Subsystem)
- เสนอราคาและอัปเดตกระดานประมูลสดทันทีผ่าน WebSocket
- ระบบ Anti-Sniping ขยายเวลาปิดประมูลอัตโนมัติ 5 นาทีเมื่อมีการเสนอราคาในช่วงท้าย
- รองรับการตั้งราคาเริ่มต้น (Starting Bid), ขั้นต่ำในการบิด (Bid Increment) และราคาปิดด่วน (Auto Buy / AB)

### 2. ระบบคอมมิชชันและคิวงาน (Commission & Queue Management)
- ติดตามขั้นตอนการทำงานอย่างเป็นระบบ (Pending → Sketching → Lining → Coloring → Completed)
- ผู้จ้างสามารถตรวจรับแบบร่างและส่งฟีดแบ็กแก้ไขในแต่ละขั้นตอน
- ระบบแชทสนทนาประจำออเดอร์สำหรับการบรีฟงานโดยเฉพาะ

### 3. ระบบการเงินและแบ่งชำระเป็นงวด (Milestone Billing)
- รองรับการแบ่งจ่ายค่าคอมมิชชันเป็นงวด (เช่น มัดจำ 50% และจ่ายส่วนที่เหลือเมื่องานเสร็จ)
- ระบบอัปโหลดและตรวจสอบสลิปการโอนเงิน

### 4. ระบบป้องกันลิขสิทธิ์และส่งมอบไฟล์ (Security & Watermarking)
- ฝั่งเซิร์ฟเวอร์ประมวลผลใส่ลายน้ำไดนามิกอัตโนมัติลงบนภาพพรีวิวและภาพตรวจแบบร่าง (ด้วย Pillow)
- แยกพื้นที่จัดเก็บไฟล์ต้นฉบับความละเอียดสูง (Master File) ในส่วนที่ปลอดภัย และจะปลดล็อกให้ดาวน์โหลดได้เฉพาะเมื่อยืนยันยอดชำระเงินครบถ้วนแล้วเท่านั้น

### 5. รองรับการใช้งานหลายภาษา (Multi-language Support)
- รองรับการสลับภาษาทั้งภาษาไทย (TH) และภาษาอังกฤษ (EN) ผ่าน Next-intl

---

## สถาปัตยกรรมระบบ (System Architecture)

```text
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│     Next.js 16 (React 19) + TanStack Query v5 + Tailwind    │
└──────────────────────────────┬──────────────────────────────┘
                               │
               HTTP / REST API │ WebSockets (Live Bid & Chat)
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      Backend Layer                          │
│                   FastAPI + SQLModel                        │
│                                                             │
│  [Auth / JWT]    [Auction WS]    [Order / Queue Pipeline]   │
│         │              │                      │             │
│         └──────────────┼──────────────────────┘             │
│                        ▼                                    │
│             [Pillow Watermark Engine]                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Persistence Layer                        │
│        SQLite (WAL Mode) / PostgreSQL Compatible            │
│        Local Protected Storage (/uploads)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| ฝั่งการทำงาน | เทคโนโลยีที่ใช้ |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), TypeScript, React 19, Tailwind CSS, TanStack Query v5, Lucide Icons, Next-intl |
| **Backend** | FastAPI (Python 3.12+), SQLModel, Uvicorn, Pillow (Image Processing), Pydantic v2 |
| **Database** | SQLite (เปิดใช้งาน WAL High-Speed Mode) / รองรับการสลับไปใช้ PostgreSQL ผ่าน SQLAlchemy |
| **Real-time** | WebSockets (FastAPI ConnectionManager) |

---

## โครงสร้างโปรเจกต์ (Project Structure)

```text
Dice/
├── backend/
│   ├── api/             # API Routers แยกตามโมดูล (auth, artists, auctions, orders, ฯลฯ)
│   ├── core/            # การตั้งค่าฐานข้อมูล, ระบบความปลอดภัย, JWT และ Config
│   ├── models/          # SQLModel Database Schemas
│   ├── services/        # Service logic เช่น ระบบประมวลผลภาพและลายน้ำ
│   ├── uploads/         # พื้นที่จัดเก็บไฟล์อัปโหลดและไฟล์ลายน้ำ
│   ├── main.py          # FastAPI Application Entrypoint
│   └── pyproject.toml   # การกำหนดแพ็กเกจและ Dependencies ของ Python
├── frontend/
│   ├── src/
│   │   ├── app/         # Next.js App Router (โครงสร้างหน้าเว็บตาม locale)
│   │   ├── components/  # Reusable UI Components
│   │   └── messages/    # ไฟล์แปลภาษา i18n (en.json, th.json)
│   ├── package.json     # Node.js Dependencies และ Scripts
│   └── next.config.ts   # การตั้งค่า Next.js และ Proxy API Rewrite
├── docs/                # เอกสารการออกแบบระบบ, Sequence Diagrams, และเนื้อหาบัณฑิตนิพนธ์
├── run_dev.bat          # สคริปต์รันโหมด Dev บน Windows
├── run_prod.bat         # สคริปต์รันโหมด Production บน Windows
├── run.sh               # สคริปต์รันบน Linux / macOS
└── stop.sh              # สคริปต์ปิดทุก Services บน Linux / macOS
```

---

## การติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)
- **Node.js:** เวอร์ชัน 18.0 ขึ้นไป
- **Python:** เวอร์ชัน 3.12 ขึ้นไป
- **uv:** เครื่องมือจัดการแพ็กเกจ Python ([ดูวิธีติดตั้ง uv](https://docs.astral.sh/uv/getting-started/installation/))

---

### วิธีที่ 1: รันผ่าน Script อัตโนมัติ

**บน Windows:**
- **Development Mode:** ดับเบิลคลิก `run_dev.bat`
- **Production Mode:** ดับเบิลคลิก `run_prod.bat` (แนะนำเมื่อต้องการความเสถียรและประหยัดแรม)

**บน Linux / macOS:**
```bash
# รันโหมด Development (Hot Reload ทั้ง Backend และ Frontend)
./run.sh

# รันโหมด Production
./run.sh prod

# ปิดทุก Services ที่รันอยู่บน Port 8000 และ 3000
./stop.sh
```

---

### วิธีที่ 2: รันแยกทีละส่วนด้วยตัวเอง (Manual Setup)

#### 1. ฝั่ง Backend
```bash
cd backend

# ซิงก์และติดตั้ง Dependencies ผ่าน uv
uv sync

# เริ่มการทำงานของ Server
uv run uvicorn main:app --reload --port 8000
```
- API Endpoint: `http://localhost:8000`
- Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`
- Alternative API Documentation (ReDoc): `http://localhost:8000/redoc`

#### 2. ฝั่ง Frontend
```bash
cd frontend

# ติดตั้ง Dependencies
npm install

# รันในโหมด Development
npm run dev
```
- เข้าใช้งานเว็บแอปพลิเคชันได้ที่: `http://localhost:3000`

---

## การจัดการข้อมูลทดสอบ (Data Seeding & Migration)

หากต้องการเติมข้อมูลตัวอย่างสำหรับใช้ทดสอบหน้าเว็บ (เช่น ศิลปินจำลอง, ผลงาน, รายการประมูล):

```bash
cd backend

# สร้างข้อมูลตัวอย่าง (ศิลปิน, แกลเลอรี, รายการประมูล)
uv run seed_fake_data.py

# ล้างข้อมูลตัวอย่างที่เคยสร้างไว้
uv run clean_fake_data.py
```

---

## การกำหนดค่าตัวแปรสภาพแวดล้อม (Environment Variables)

ไฟล์คอนฟิกหลักของ Backend อยู่ที่ `backend/.env`:

```env
# ที่อยู่ฐานข้อมูล (รองรับทั้ง SQLite และ PostgreSQL)
DATABASE_URL=sqlite:///./test.db

# รหัสลับสำหรับเซ็นและถอดรหัส JWT Token
SECRET_KEY=super_secret_key_change_me_in_production_123456

# Redis สำหรับระบบคิวและการแจ้งเตือน (Optional)
REDIS_URL=redis://localhost:6379/0
```

---

## บัญชีสำหรับทดสอบระบบ (Default Test Accounts)

| บทบาท (Role) | อีเมล (Email) | รหัสผ่าน (Password) | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| **Admin / Artist** | `admin@example.com` | `password123` | สิทธิ์ผู้ดูแลระบบและบัญชีศิลปินหลัก |
| **Client** | `client@example.com` | `password123` | บัญชีผู้ใช้งานทั่วไปสำหรับทดสอบจ้างงานและบิดประมูล |
| **Sample Artist 1** | `artist1@example.com` | `password123` | ศิลปินตัวอย่าง (Akira Studio) เมื่อรัน seed_fake_data |

*สำหรับการทดสอบลงทะเบียนศิลปินใหม่ สามารถเข้าผ่านหน้าเว็บที่:* `http://localhost:3000/th/artists/register`

---

## เอกสารการออกแบบและรายละเอียดเพิ่มเติม (Documentation)

รายละเอียดเชิงลึกและเอกสารทางวิชาการของโครงการถูกรวบรวมไว้ในโฟลเดอร์ `docs/`:

- **Master System Prompt:** [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md)
- **แผนงานความปลอดภัย (Security Remediation):** [`docs/SECURITY_REMEDIATION_PLAN.md`](docs/SECURITY_REMEDIATION_PLAN.md)
- **สถานะการพัฒนาภาพรวม:** [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md)
- **ข้อกำหนดความต้องการเชิงฟังก์ชัน (SRS):** [`docs/SYSTEM_REQUIREMENTS.md`](docs/SYSTEM_REQUIREMENTS.md)
- **การออกแบบฐานข้อมูล (ER / Schema):** [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md)
- **ไดอะแกรมลำดับการทำงาน (Sequence Diagrams):** [`docs/SEQUENCE_DIAGRAMS.md`](docs/SEQUENCE_DIAGRAMS.md)
- **ไดอะแกรมกิจกรรม (Activity Diagrams):** [`docs/ACTIVITY_DIAGRAMS.md`](docs/ACTIVITY_DIAGRAMS.md)
- **ข้อเสนอโครงงานและบทนำ:** [`docs/THESIS_PROPOSAL.md`](docs/THESIS_PROPOSAL.md) และ [`docs/THESIS_CHAPTER_1.md`](docs/THESIS_CHAPTER_1.md)
