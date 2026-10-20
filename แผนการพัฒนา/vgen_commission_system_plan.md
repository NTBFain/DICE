# 🎲 แผนการพัฒนาระบบรับงานคอมมิชชันหลายสเกล (VGen-Style Multi-Scale Commission Form & Intake System)

> **เอกสารข้อกำหนดและการออกแบบระบบ (System Design & Implementation Blueprint)**  
> แพลตฟอร์ม: **DICE (Freelance Art Commission & Live Auction Platform)**  
> วันที่ปรับปรุงล่าสุด: **16 ตุลาคม 2026**  
> สถานะ: **แบบร่างแผนการพัฒนา (Planning & Architecture Specification - v1.2)**

---

## 📋 1. บทนำและเป้าหมายของระบบ (System Goals & Motivation)

### 1.1 ที่มาและปัญหาเดิม
ในระบบเดิมของ DICE การสั่งคอมมิชชันระหว่างผู้จ้าง (Client) และศิลปิน (Artist) เป็นการเปิดฟอร์มเรียบง่ายที่มีเพียงช่องระบุชื่อหัวข้อ (`Title`) และรายละเอียดทั่วไป (`Description`) ซึ่งก่อให้เกิดปัญหา:
* ผู้จ้างไม่ทราบขอบเขตงานและราคาที่แน่นอนก่อนเริ่มคุย
* ศิลปินต้องเสียเวลาสอบถามรายละเอียดซ้ำซ้อน (เช่น ขอเรฟตัวละคร, ขนาดภาพ, ลิขสิทธิ์การนำไปใช้, เดดไลน์)
* ขาดการคัดกรองงานที่ศิลปินไม่ถนัดหรือไม่รับวาด (Do's & Don'ts) ทำให้เกิดการปฏิเสธงานหรือข้อพิพาทในภายหลัง
* ขาดการรับรองข้อตกลงและเงื่อนไขสัญญา (Terms of Service / TOS) อย่างเป็นทางการก่อนเริ่มงาน
* ศิลปินไม่สามารถควบคุมการเปิด-ปิดรับฟอร์มตามความสะดวก และผู้ที่สนใจต้องคอยส่องหน้าโปรไฟล์เองเพราะไม่มีระบบแจ้งเตือนคิวเปิด

### 1.2 วัตถุประสงค์ของการพัฒนาระบบสไตล์ VGen
1. **รองรับบริการหลายสเกล (Multi-Scale Services):** ศิลปินสามารถเปิดรับงานได้หลายประเภท (Headshot, Half-body, Full-body, Chibi, Character Sheet, VTuber Model) โดยมีราคาเริ่มต้น ระยะเวลาทำงาน และโควตาสล็อตแยกจากกัน
2. **ระบบเปิด-ปิดรับฟอร์มตามใจศิลปิน (Artist-Controlled Availability):**
   * ศิลปินสามารถกดสวิตช์ Toggle เปิด/ปิดรับฟอร์มของทั้งสตูดิโอ (Master Switch) หรือเลือกเปิด/ปิดเฉพาะบางสเกลงานได้อิสระ
   * รองรับการตั้งระบบปิดรับอัตโนมัติเมื่อคิวเต็ม (`Auto-close when slots reach max`) หรือตั้งเวลาระบุรอบเปิดรับล่วงหน้า (`Scheduled Opening Countdown`)
3. **ระบบกระดิ่งแจ้งเตือนเมื่อเปิดรับงาน (Slot Opening Notifications):**
   * ผู้ใช้ที่สนใจสามารถกดปุ่มกระดิ่ง 🔔 *"แจ้งเตือนเมื่อเปิดรับงาน (Notify Me When Slots Open)"* บนหน้าโปรไฟล์หรือสเกลงานที่ปิดอยู่
   * เมื่อศิลปินกดเปิดรับฟอร์ม ระบบจะส่งข้อความแจ้งเตือน (In-App Push & WebSocket) ไปยังผู้ติดตามทุกคนทันทีแบบ Real-time พร้อมลิงก์เข้าสู่ฟอร์มสั่งจ้าง
4. **ระบบกำหนดข้อจำกัดงาน (Do's & Don'ts):** ระบุสิ่งที่รับวาด (Will Draw) และไม่รับวาด (Won't Draw) แสดงเป็นป้ายกำกับชัดเจนก่อนเริ่มกรอกฟอร์ม
5. **ระบบเงื่อนไขสัญญาและนโยบาย (Artist Terms of Service):** สัญญาลิขสิทธิ์, นโยบายคืนเงิน, โควตาการแก้งาน และข้อกำหนดห้ามนำไปเทรน AI (No-AI Training Guarantee)
6. **ฟอร์มบรีฟงานมาตรฐาน (Structured Intake Brief):** แนบไฟล์ภาพตัวละครเรฟเฟอเรนซ์, รายละเอียดท่าทาง, อารมณ์, สีหน้า, ขนาดภาพ, และวันส่งงานที่ต้องการ
7. **คำนวณราคาประเมินสด (Real-time Dynamic Pricing):** สรุปราคารวมตามตัวเลือกเสริม (Add-ons) เช่น สิทธิ์เชิงพาณิชย์, เพิ่มตัวละคร, ฉากหลังละเอียด, งานด่วน
8. **กลไกการพิจารณาคำขอ (Request Inbox & Workflow):** ศิลปินมีสิทธิ์ตัดสินใจ ยอมรับ (Accept), ปฏิเสธพร้อมเหตุผล (Decline), หรือยื่นข้อเสนอใหม่ (Counter-Offer) ก่อนที่ระบบจะแปลงข้อมูลเป็นคิวงาน Order จริง

---

## 📐 2. แผนผังการทำงานภาพรวม (Architecture & Workflow Diagram)

```mermaid
flowchart TD
    subgraph ArtistSide["1. ศิลปินจัดการบริการและการเปิด-ปิดรับงาน (Artist Dashboard)"]
        AP["โปรไฟล์ศิลปิน"]
        TOS["นโยบายกลาง (TOS & Policies)<br/>• ห้ามใช้กับ AI • นโยบายคืนเงิน • โควตาแก้งาน"]
        Limits["ข้อจำกัดงาน (Do's & Don'ts)<br/>• Will: OC, Fanart • Won't: NSFW, Mecha"]
        
        ToggleControl{"สวิตช์ควบคุมการเปิดรับฟอร์ม<br/>(Master & Per-Scale Toggles)"}
        S1["สเกล 1: Headshot (สถานะ: OPEN)"]
        S2["สเกล 2: Full-Body (สถานะ: CLOSED)"]
        S3["สเกล 3: VTuber (สถานะ: WAITLIST)"]

        AP --> TOS
        AP --> Limits
        AP --> ToggleControl
        ToggleControl --> S1
        ToggleControl --> S2
        ToggleControl --> S3
    end

    subgraph NotificationSystem["2. ระบบติดตามและการแจ้งเตือนคิว (Slot Alert Subsystem)"]
        ClientBell["ผู้ใช้กดกระดิ่ง 🔔<br/>'แจ้งเตือนฉันเมื่อคิวเปิด'"]
        SubDB[("บันทึกการติดตาม<br/>(Slot Subscription)")]
        ArtistOpens["ศิลปินกดเปิดรับสเกลงาน<br/>Toggle ➔ OPEN"]
        PushEngine["Notification Dispatcher<br/>(WebSocket + In-App Notification)"]
        PushAlert["ส่งแจ้งเตือนด่วน:<br/>'🎨 ศิลปิน @handle เปิดรับคิวแล้ว!'"]

        S2 -.->|สถานะ CLOSED| ClientBell
        ClientBell --> SubDB
        ArtistOpens --> PushEngine
        SubDB --> PushEngine
        PushEngine --> PushAlert
    end

    subgraph ClientSide["3. ผู้จ้างกรอกฟอร์มขอจ้าง (Client Intake Flow)"]
        PushAlert --> SelectScale
        SelectScale["ผู้จ้างเลือกสเกลงานที่เปิดรับ"]
        CheckRules["ตรวจสอบเงื่อนไข Do's & Don'ts"]
        CustomAddons["เลือก Add-ons เสริม (เพิ่มตัวละคร/เชิงพาณิชย์)"]
        FillBrief["กรอกบรีฟ + แนบภาพ Reference"]
        AgreeTOS["กดยอมรับ TOS & No-AI Policy"]
        SubmitReq["ส่งคำขอจ้างงาน (Commission Proposal)"]

        SelectScale --> CheckRules --> CustomAddons --> FillBrief --> AgreeTOS --> SubmitReq
    end

    subgraph ReviewPipeline["4. การคัดกรองและเริ่มงาน (Order Pipeline)"]
        ArtistInbox["Artist Requests Inbox<br/>(ตรวจสอบบรีฟและภาพเรฟ)"]
        ActionAccept{"ศิลปินตัดสินใจ"}
        ActiveOrder["แปลงเป็น Active Order<br/>เข้าสู่ 5-Stage Queue<br/>(Pending ➔ Sketch ➔ Color...)"]
        DeclineWithReason["ปฏิเสธพร้อมระบุเหตุผล<br/>(เช่น สล็อตเต็ม / ผิด Do's & Don'ts)"]
        CounterOffer["ต่อรองราคาหรือเดดไลน์ใหม่"]

        SubmitReq --> ArtistInbox --> ActionAccept
        ActionAccept -->|Accept| ActiveOrder
        ActionAccept -->|Decline| DeclineWithReason
        ActionAccept -->|Adjust| CounterOffer
    end

    S1 -.-> SelectScale
    TOS -.-> AgreeTOS
    Limits -.-> CheckRules
```

---

## 🗄️ 3. การออกแบบฐานข้อมูล (Database Schema Specifications)

```mermaid
erDiagram
    ARTIST_PROFILE ||--o{ ARTIST_COMMISSION_POLICY : "defines TOS & limits"
    ARTIST_PROFILE ||--o{ COMMISSION_SERVICE : "hosts multiple scales"
    ARTIST_PROFILE ||--o{ COMMISSION_SLOT_SUBSCRIPTION : "has alert subscribers"
    COMMISSION_SERVICE ||--o{ SERVICE_ADDON : "has add-ons"
    COMMISSION_SERVICE ||--o{ COMMISSION_REQUEST : "receives"
    COMMISSION_SERVICE ||--o{ COMMISSION_SLOT_SUBSCRIPTION : "has service subscribers"
    
    USER ||--o{ COMMISSION_REQUEST : "submits as client"
    USER ||--o{ COMMISSION_SLOT_SUBSCRIPTION : "subscribes to slot alerts"
    COMMISSION_REQUEST ||--o| ORDER : "converts into"
    COMMISSION_REQUEST ||--o{ REQUEST_REFERENCE_IMAGE : "contains refs"

    ARTIST_COMMISSION_POLICY {
        int id PK
        int artist_id FK
        text terms_of_service "สัญญาและข้อตกลงลิขสิทธิ์"
        text refund_policy "นโยบายการคืนเงิน"
        text ai_policy "นโยบายการห้ามใช้เทรน AI"
        text will_draw "สิ่งที่รับวาด (JSON Array)"
        text wont_draw "สิ่งที่ไม่รับวาด (JSON Array)"
        int default_revision_quota "โควตาแก้งานฟรีเริ่มต้น"
    }

    COMMISSION_SERVICE {
        int id PK
        int artist_id FK
        string title "เช่น Full Body Illustration"
        string scale_category "HEADSHOT, BUST_UP, FULL_BODY, CHIBI, VTUBER, CUSTOM"
        text description "คำอธิบายรายละเอียดสเกลงาน"
        float base_price "ราคาเริ่มต้นของสเกลนี้"
        int estimated_days "ระยะเวลาทำงานเฉลี่ย (วัน)"
        int max_slots "จำนวนคิวสูงสุดที่รับได้"
        int active_slots "จำนวนคิวที่กำลังทำอยู่"
        string slot_status "OPEN, WAITLIST, CLOSED"
        boolean is_form_open "สวิตช์เปิด-ปิดรับฟอร์มของสเกลนี้"
        boolean auto_close_on_full "ปิดรับฟอร์มอัตโนมัติเมื่อคิวเต็ม"
        datetime next_open_schedule "วันเวลาเปิดรับรอบถัดไป (ถ้ามี)"
        boolean commercial_allowed "อนุญาตให้ใช้เชิงพาณิชย์หรือไม่"
        float commercial_multiplier "ตัวคูณราคาเชิงพาณิชย์ เช่น 1.5x หรือ 2x"
        string sample_image_url "ภาพตัวอย่างสเกลงาน"
    }

    COMMISSION_SLOT_SUBSCRIPTION {
        int id PK
        int user_id FK "ผู้ใช้ที่เปิดรับการแจ้งเตือน"
        int artist_id FK "ศิลปินที่ติดตาม"
        int service_id FK "สเกลเฉพาะเจาะจง (NULL คือทุกสเกล)"
        boolean is_active "สถานะการแจ้งเตือนยังเปิดอยู่หรือไม่"
        datetime created_at "วันที่กดเปิดแจ้งเตือน"
        datetime last_notified_at "เวลาที่ส่งแจ้งเตือนล่าสุด"
    }

    SERVICE_ADDON {
        int id PK
        int service_id FK
        string name "ชื่อตัวเลือกเสริม"
        string price_type "FIXED, PERCENTAGE"
        float price_value "มูลค่าส่วนเสริม"
    }

    COMMISSION_REQUEST {
        int id PK
        int service_id FK
        int client_id FK
        int artist_id FK
        string status "PENDING_REVIEW, ACCEPTED, DECLINED, COUNTER_OFFER"
        string character_name "ชื่อตัวละคร"
        string usage_type "PERSONAL, COMMERCIAL_STREAMING, COMMERCIAL_MERCH"
        text visual_description "รายละเอียดรูปร่าง หน้าตา เสื้อผ้า"
        text pose_and_mood "ท่าทาง อารมณ์ สีหน้า แสงเงา"
        string canvas_size "ขนาดและแนวภาพ (Square, A4, 16:9, Custom)"
        datetime requested_deadline "วันส่งงานที่ผู้จ้างต้องการ"
        json selected_addons "รายการ Add-on ที่เลือกและราคา"
        float estimated_total_price "ราคารวมที่ประเมินได้"
        boolean agreed_to_tos "ยืนยันยอมรับข้อตกลงและนโยบาย"
        text decline_reason "เหตุผลที่ปฏิเสธ (ถ้ามี)"
        float counter_price "ราคาที่เสนอปรับ (ถ้ามี)"
        int converted_order_id FK "Order ID เมื่อกดยอมรับ"
    }
```

### 3.1 รายละเอียดโมเดล SQLModel ใหม่ (Python Definition)

```python
from enum import Enum
from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

class ScaleCategory(str, Enum):
    HEADSHOT = "HEADSHOT"
    BUST_UP = "BUST_UP"
    WAIST_UP = "WAIST_UP"
    FULL_BODY = "FULL_BODY"
    CHIBI = "CHIBI"
    CHARACTER_SHEET = "CHARACTER_SHEET"
    VTUBER_MODEL = "VTUBER_MODEL"
    CUSTOM = "CUSTOM"

class SlotStatus(str, Enum):
    OPEN = "OPEN"
    WAITLIST = "WAITLIST"
    CLOSED = "CLOSED"

# เพิ่มประเภท NotificationType
# NotificationType.COMMISSION_SLOT_OPEN = "COMMISSION_SLOT_OPEN"

class CommissionSlotSubscription(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    artist_id: int = Field(foreign_key="artistprofile.id", ondelete="CASCADE", index=True)
    service_id: Optional[int] = Field(default=None, foreign_key="commissionservice.id", ondelete="CASCADE", index=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_notified_at: Optional[datetime] = None
```

---

## 🔄 4. ขั้นตอนการทำงานแบบโต้ตอบ (Sequence Diagrams)

### 4.1 กระบวนการกดติดตามคิว และการส่งแจ้งเตือนเมื่อศิลปินเปิดรับฟอร์ม (Slot Alerts)

```mermaid
sequenceDiagram
    autonumber
    actor Client as ผู้ใช้/ลูกค้า (Client)
    participant UI as หน้าเว็บ DICE (Frontend)
    participant API as Backend (FastAPI)
    actor Artist as ศิลปิน (Artist)

    Note over Client, UI: 1. ผู้ใช้กดรับการแจ้งเตือนคิว
    Client->>UI: พบว่าสเกล Full-Body ขึ้นสถานะ "CLOSED (0/3 สล็อต)"
    Client->>UI: กดปุ่มกระดิ่ง 🔔 "แจ้งเตือนเมื่อเปิดรับงาน (Notify Me)"
    UI->>API: POST /api/commissions/subscriptions (artist_id, service_id)
    API-->>UI: บันทึกสำเร็จ (Subscription Active)
    UI-->>Client: แสดงปุ่มเป็น 🔔 "กำลังเปิดรับการแจ้งเตือนแล้ว"

    Note over Artist, API: 2. ศิลปินพร้อมรับงาน และกดเปิดรับฟอร์ม
    Artist->>UI: เข้า Artist Dashboard ➔ Commission Settings
    Artist->>UI: สับสวิตช์ Toggle สเกล Full-Body เป็น "OPEN"
    UI->>API: PATCH /api/artists/me/commission-services/{id}/toggle-status (status="OPEN", is_form_open=True)
    
    API->>API: ตรวจสอบฐานข้อมูลพบผู้ใช้ที่กด Subscribed ไว้
    API->>API: สร้าง Notification ในฐานข้อมูล (type="COMMISSION_SLOT_OPEN")
    API->>UI: ส่ง WebSocket Event: "SLOT_OPENED" ถึง Client ทุกคนที่ Subscribe
    API-->>Artist: อัปเดตสถานะสำเร็จ และแจ้ง "ส่งการแจ้งเตือนไปยังผู้ติดตาม 18 คนแล้ว"

    Note over Client, UI: 3. ผู้ใช้ได้รับการแจ้งเตือนทันที
    UI-->>Client: เด้ง Pop-up Notification & เสียงแจ้งเตือน: <br/>"🔔 ศิลปิน @handle เปิดรับคอมมิชชัน Full-Body แล้ว! คลิกเพื่อส่งบรีฟ"
    Client->>UI: กดที่การแจ้งเตือน นำทางเข้าสู่หน้า Commission Intake Form ทันที
```

---

### 4.2 กระบวนการกรอกบรีฟและพิจารณาคำขอ (Intake & Order Workflow)

```mermaid
sequenceDiagram
    autonumber
    actor Client as ผู้จ้าง (Client)
    participant UI as หน้าเว็บ DICE (Frontend)
    participant API as Backend (FastAPI)
    actor Artist as ศิลปิน (Artist)

    Note over Client, UI: 1. ตรวจสอบข้อมูลก่อนจ้าง
    Client->>UI: เปิดหน้าคอมมิชชันของศิลปิน (/artists/{handle}/commissions)
    UI->>API: GET /api/artists/{handle}/commission-services
    API-->>UI: รายการสเกลงานทั้งหมด + TOS + Do's & Don'ts
    UI-->>Client: แสดงแถบ "Do's & Don'ts" ชัดเจน (เช่น Will: OC, Fanart / Won't: Mecha, NSFW)

    Note over Client, UI: 2. เลือกสเกลและกรอกฟอร์มบรีฟ (VGen Style)
    Client->>UI: เลือกสเกล (เช่น Full-Body) และเลือก Add-ons
    UI->>UI: อัปเดตราคารวมและระยะเวลาส่งงานแบบ Real-time
    Client->>UI: กรอกบรีฟตัวละคร + อัปโหลดภาพเรฟ (.png, .jpg)
    Client->>UI: กดยอมรับ [x] "I agree to Artist's TOS & No-AI Policy"
    Client->>UI: กด "Submit Commission Request"

    Note over UI, API: 3. บันทึกคำขอและแจ้งเตือนศิลปิน
    UI->>API: POST /api/commissions/requests (Payload + Form Data)
    API->>API: ตรวจสอบความถูกต้องและบันทึกภาพ Reference
    API-->>Artist: ส่ง Notification / WebSocket: "คุณได้รับคำขอคอมมิชชันใหม่!"

    Note over Artist, API: 4. ศิลปินพิจารณาคำขอใน Inbox
    Artist->>UI: เข้าหน้า Dashboard ➔ "Commission Requests"
    Artist->>UI: ตรวจสอบบรีฟ, ภาพเรฟ, และราคาประเมิน
    
    alt กรณีที่ 1: ศิลปินกดยอมรับ (Accept)
        Artist->>UI: เลือกรูปแบบการจ่าย (เช่น มัดจำงวดแรก 50% หรือจ่ายเต็ม 100%)
        Artist->>API: POST /api/commissions/requests/{id}/accept
        API->>API: สร้าง Order ใหม่ในระบบ + สร้าง Milestone Invoice
        API->>API: อัปเดต Slot นับจำนวนงานที่รับอยู่ (+1 Active Slot)
        opt ถ้าจำนวนคิวถึงเพดาน (active_slots >= max_slots) และตั้ง auto_close ไว้
            API->>API: ปิดรับฟอร์มอัตโนมัติ (is_form_open = False, status = 'CLOSED')
        end
        API-->>Client: แจ้งเตือน: "คำขอของคุณได้รับการยอมรับแล้ว! โปรดชำระเงินมัดจำ"
    else กรณีที่ 2: ศิลปินเสนอราคา/วันส่งใหม่ (Counter-Offer)
        Artist->>API: POST /api/commissions/requests/{id}/counter-offer (ราคาใหม่, วันที่ใหม่)
        API-->>Client: แจ้งเตือน: "ศิลปินเสนอปรับราคาหรือเวลาส่งงาน โปรดตรวจสอบ"
    else กรณีที่ 3: ศิลปินปฏิเสธ (Decline)
        Artist->>API: POST /api/commissions/requests/{id}/decline (ใส่เหตุผล เช่น คิวเต็ม/ติดงานด่วน)
        API-->>Client: แจ้งเตือนพร้อมแสดงเหตุผลที่ศิลปินไม่สามารถรับได้
    end
```

---

## 🎨 5. การออกแบบหน้าจอและประสบการณ์ผู้ใช้ (UI/UX Design)

### 5.1 ฝั่งศิลปิน: การควบคุมเปิด-ปิดรับฟอร์ม (Form Availability Controls)
* **Master Commission Switch:** สวิตช์หลักที่หัว Dashboard เพื่อเปิด/ปิดรับงานทุกประเภทในคลิกเดียว (Open / On Hiatus / Closed)
* **Per-Scale Card Controls:** บนการ์ดสเกลงานแต่ละชิ้น มีแผงควบคุมย่อย:
  * สวิตช์ Toggle `เปิดรับฟอร์ม (Form Open)` vs `ปิดรับชั่วคราว (Form Closed)`
  * ตัวนับ Slot: กำหนด Maximum Slots (เช่น 3 คิว)
  * Checkbox: `[x] ปิดรับฟอร์มอัตโนมัติทันทีที่คิวเต็ม (Auto-close when full)`
  * ช่องระบุวันเวลารอบเปิดรับครั้งต่อไป (Next Opening Countdown Timer) เพื่อให้หน้าเว็บขึ้นเวลานับถอยหลังดึงดูดผู้จ้าง

### 5.2 ฝั่งผู้จ้าง: การกดรับแจ้งเตือน (Slot Alert Subscription)
* **ปุ่มกระดิ่งแจ้งเตือน (Notify Button):**
  * เมื่อสเกลงานขึ้นป้าย `CLOSED` หรือ `WAITLIST` ปุ่ม "Request Commission" จะเปลี่ยนเป็นปุ่ม `🔔 แจ้งเตือนเมื่อคิวเปิด (Notify Me When Open)`
  * เมื่อกดแล้วจะเปลี่ยนสถานะเป็น `✓ เปิดแจ้งเตือนแล้ว (Subscribed)` พร้อมแสดงจำนวนผู้รอคิว (เช่น *"มีผู้รอคิว 15 คน"*)
* **Real-time Alert Banner & In-App Notification:**
  * เมื่อศิลปินเปิดรับ จะมี Pop-up Toast สวยงามโผล่ขึ้นมาทันที พร้อมปุ่มลัด `"ส่งคำขอทันที (Request Now)"`

### 5.3 หน้าฟอร์มบรีฟงานสไตล์ VGen (Commission Intake Modal)
* **Step 1: Scope & Add-ons**
  * สลับเลือกสเกลงานได้ง่าย พร้อมแสดงราคาฐาน
  * Checkbox Add-ons คำนวณราคาแบบ Real-time:
    * `[ ]` เพิ่มตัวละคร (+80%)
    * `[ ]` ฉากหลังระดับละเอียดพิเศษ (+฿1,200)
    * `[ ]` ขอไฟล์ต้นฉบับ .PSD แยกเลเยอร์ (+฿800)
    * `[ ]` สิทธิ์ใช้งานเชิงพาณิชย์ / Commercial License (+100%)
    * `[ ]` ลัดคิวงานด่วนภายใน 5 วัน (+฿1,500)
* **Step 2: Creative Brief & Visual References**
  * กล่อง Drag & Drop อัปโหลดภาพเรฟฟอร์แมนซ์ (Thumbnail Preview พร้อมปุ่มลบ)
  * ฟิลด์บรีฟที่มีตัวอย่างข้อความแนะนำ (Placeholder Guide)
  * ตัวเลือก Canvas Orientation (Square 1:1, Portrait 9:16, Landscape 16:9, Custom)
  * Deadline Picker พร้อมระบบแจ้งเตือนสีเหลืองหากเลือกวันส่งงานสั้นกว่าเกณฑ์มาตรฐานของศิลปิน
* **Step 3: TOS & Summary**
  * Sticky Summary Card ด้านข้าง: แสดงรายการที่เลือก ราคารวม ยอดมัดจำโดยประมาณ
  * กล่องแสดงนโยบาย TOS ของศิลปิน + Do's & Don'ts Card
  * Checkbox บังคับ: `"ข้าพเจ้ายอมรับเงื่อนไขสัญญาของศิลปินและรับทราบว่าผลงานนี้จะไม่ถูกนำไปใช้เทรน AI"`

---

## 🔌 6. รายการ API Endpoints (Backend REST API)

| Method | Endpoint | สิทธิ์เข้าถึง | คำอธิบาย |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/artists/{handle}/commission-services` | Public | ดึงรายการสเกลงานทั้งหมด, สถานะเปิด/ปิดรับฟอร์ม, Do's & Don'ts, และ TOS |
| `POST` | `/api/artists/me/commission-services` | Artist | สร้างสเกลงานใหม่ |
| `PUT` | `/api/artists/me/commission-services/{id}` | Artist | แก้ไขข้อมูลสเกลงานและจำนวนสล็อต |
| `PATCH` | `/api/artists/me/commission-services/{id}/toggle-status` | Artist | สลับสถานะเปิด/ปิดรับฟอร์ม (ถ้าเปิด จะทริกเกอร์ยิงแจ้งเตือนไปยังผู้ติดตาม) |
| `PATCH` | `/api/artists/me/commission-status` | Artist | สลับสถานะภาพรวมของสตูดิโอ (OPEN / WAITLIST / CLOSED) |
| `PUT` | `/api/artists/me/commission-policy` | Artist | บันทึก/แก้ไข TOS, Do's & Don'ts, และนโยบายคืนเงิน |
| `POST` | `/api/commissions/subscriptions` | Client | กดเปิดรับการแจ้งเตือนเมื่อศิลปิน/สเกลเปิดรับคิว |
| `DELETE` | `/api/commissions/subscriptions/{id}` | Client | ยกเลิกการรับแจ้งเตือน |
| `GET` | `/api/commissions/subscriptions/check` | Client | เช็คว่าผู้ใช้ปัจจุบันเปิดรับแจ้งเตือนศิลปินคนนี้ไว้หรือไม่ |
| `POST` | `/api/commissions/requests` | Client | ส่งฟอร์มขอจ้างงานพร้อมอัปโหลดภาพเรฟ |
| `GET` | `/api/commissions/requests/incoming` | Artist | ดูรายการคำขอทั้งหมดที่ส่งมาหาศิลปิน |
| `GET` | `/api/commissions/requests/my-requests` | Client | ดูประวัติคำขอที่ตนเองเคยส่ง |
| `POST` | `/api/commissions/requests/{id}/accept` | Artist | ยอมรับคำขอและสร้างเป็น `Order` พร้อมวาง `MilestoneInvoice` |
| `POST` | `/api/commissions/requests/{id}/decline` | Artist | ปฏิเสธคำขอพร้อมระบุเหตุผล |
| `POST` | `/api/commissions/requests/{id}/counter-offer` | Artist | ส่งข้อเสนอราคา/วันส่งงานใหม่กลับไปให้ผู้จ้าง |

---

## 📅 7. แผนการดำเนินงานพัฒนา (Implementation Roadmap)

```mermaid
gantt
    title ลำดับขั้นตอนการพัฒนาฟีเจอร์ (Phases Roadmap)
    dateFormat  YYYY-MM-DD
    section Phase 1: Data & Models
    Database Schemas & Models            :p1_1, 2026-10-16, 2d
    Slot Subscription & Notification     :p1_2, after p1_1, 1d
    Pydantic Request & Response Schemas  :p1_3, after p1_2, 1d
    section Phase 2: Backend APIs
    Artist Policy & Toggle Status APIs   :p2_1, after p1_3, 2d
    Slot Alert Push & Notification logic :p2_2, after p2_1, 2d
    Commission Request & Order Converter :p2_3, after p2_2, 2d
    section Phase 3: Artist Dashboard UI
    Artist TOS & Do's/Don'ts Settings    :p3_1, after p2_3, 2d
    Form Open/Close Toggles & Counters   :p3_2, after p3_1, 2d
    Artist Request Inbox & Actions Modal :p3_3, after p3_2, 2d
    section Phase 4: Client Form & Alerts
    Slot Alert Bell Button & Sub State   :p4_1, after p3_3, 2d
    Multi-Scale Intake Form & Add-ons    :p4_2, after p4_1, 3d
    Multi-file Ref Upload & TOS Modal    :p4_3, after p4_2, 2d
    Integration & End-to-End Testing     :p4_4, after p4_3, 2d
```

---

## 🔒 8. แผนความปลอดภัยและการป้องกันข้อมูล (Security & Integrity)

1. **File Upload Security:**
   * ตรวจสอบ MIME type และ Magic Bytes ของภาพ Reference อนุญาตเฉพาะ `.png`, `.jpg`, `.jpeg`, `.webp`
   * จำกัดขนาดไฟล์ไม่เกิน 10MB ต่อภาพ และไม่เกิน 50MB ต่อหนึ่งคำขอ
   * จัดเก็บในโฟลเดอร์แยก `uploads/references/{request_id}/` และสุ่มชื่อไฟล์แบบ UUID ป้องกัน Path Traversal
2. **Notification Spam Throttling:**
   * ศิลปินที่สลับ Toggle เปิด-ปิดถี่เกินไป จะมีระบบ Cooldown ป้องกันการส่งสแปมแจ้งเตือนซ้ำ (ห้ามส่งแจ้งเตือนสเกลเดิมซ้ำภายใน 30 นาที)
3. **Atomic Slot Integrity:**
   * ตรวจสอบเงื่อนไขคิวเต็มแบบ Atomic Transactions ใน SQLite/PostgreSQL เพื่อป้องกันการแย่งสล็อตเกินจำนวนที่ศิลปินกำหนด (Concurrency-Safe)
