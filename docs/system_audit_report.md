# 🔍 DICE Platform: System Audit & Code Review Report
**วันที่ตรวจสอบ:** 6 สิงหาคม 2569

รายงานฉบับนี้รวบรวม **"ช่องโหว่ (Vulnerabilities), บั๊กร้ายแรง (Critical Bugs), และปัญหาด้านสถาปัตยกรรม (Architectural Flaws)"** ทั้งหมดที่ค้นพบจากการเจาะลึก Source Code ของฝั่ง Backend และ Frontend เพื่อให้ทีมพัฒนานำไปแก้ไขก่อนนำระบบขึ้นใช้งานจริง (Production)

---

## 🚨 ระดับวิกฤต (CRITICAL) - ต้องแก้ไขทันที

### 1. โครงสร้าง Database พัง (Foreign Key Constraints Disabled)
*   **ไฟล์:** `backend/core/db.py`
*   **ปัญหา:** SQLite ปิด Foreign Key ไว้เป็นค่าเริ่มต้น แต่โค้ดลืมเปิดใช้งาน `PRAGMA foreign_keys=ON` ส่งผลให้การผูก Foreign Key ทั้งหมดไร้ความหมาย — ลบ User ทิ้งได้โดยงานศิลปะยังลอยเคว้งใน DB
*   **วิธีแก้:** เพิ่ม `cursor.execute("PRAGMA foreign_keys=ON")` ในฟังก์ชัน `set_sqlite_pragma`

### 2. ระบบประมูลพัง — NameError Crash (Bidding Logic Crash)
*   **ไฟล์:** `backend/api/routers/auctions.py` (ฟังก์ชัน `api_place_bid`, บรรทัด 227)
*   **ปัญหา:** อ้างอิงตัวแปร `artist_user` ที่ไม่ได้ประกาศ → ระบบ Crash ด้วย `NameError` ทันทีที่กด Bid + ลอจิกผิดเพราะเช็คเจ้าของผลงานในฟังก์ชันเสนอราคา
*   **วิธีแก้:** ลบบล็อก `if not artist_user.is_admin:` ออกทั้งหมด

### 3. ระบบแชทประมูลพัง — NameError Crash ซ้ำอีก 2 จุด
*   **ไฟล์:** `backend/api/routers/auctions.py`
*   **ปัญหา:** บั๊กเดียวกัน — `api_get_auction_messages` (บรรทัด 397) และ `api_create_auction_message` (บรรทัด 416) ต่างเรียก `artist_user` ที่ไม่มีตัวตน → API แชทประมูลทั้งหมดพังไม่สามารถใช้งานได้
*   **วิธีแก้:** ลบบล็อก `if not artist_user.is_admin:` ออกจากทั้งสองฟังก์ชัน

### 4. โค้ดตาย (Dead Code / Unreachable Return)
*   **ไฟล์:** `backend/api/routers/auctions.py` (บรรทัด 460-461)
*   **ปัญหา:** มี `return response_data` อยู่หลัง `return msg_response` → ไม่มีทางถูกเรียกใช้ เป็นสัญญาณ Copy-Paste ที่ทำให้เกิดบั๊กข้อ 2-3
*   **วิธีแก้:** ลบบรรทัด 460-461 ทิ้ง

### 5. ช่องโหว่ปลอมแปลง Token (Weak Default JWT Secret)
*   **ไฟล์:** `backend/core/config.py`
*   **ปัญหา:** `SECRET_KEY` ถูก Hardcode ด้วยค่า `"super_secret_key_change_me_in_production_123456"` — ถ้าลืมตั้ง `.env` แฮกเกอร์สามารถปลอม Token เป็น Admin ได้ทันที (CWE-798)
*   **วิธีแก้:** บังคับโหลดจาก `.env` เท่านั้น ถ้าไม่มีค่าให้ Throw Error ตอน Startup

### 6. ช่องโหว่ใครก็เพิ่มแพ็กเกจให้ศิลปินอื่นได้ (Broken Access Control)
*   **ไฟล์:** `backend/api/routers/artists.py` (ฟังก์ชัน `add_artist_service`)
*   **ปัญหา:** ลืมใส่ `Depends(get_current_user)` ทำให้ API เปิดสาธารณะ (Public)
*   **วิธีแก้:** บังคับล็อกอินและเช็คว่า `current_user.id` ตรงกับเจ้าของโปรไฟล์

---

## 🔴 ระดับสูง (HIGH) - เสี่ยงต่อข้อมูลและความปลอดภัย

### 7. เงินติดลบได้! ไม่มี Validation จำนวนเงิน (Negative Amount Injection)
*   **ไฟล์:** `backend/schemas/auction.py` และ `backend/schemas/order.py`
*   **ปัญหา:** ฟิลด์เงินทั้งหมด (`amount`, `starting_bid`, `bid_increment`, `agreed_price`) ถูกกำหนดเป็น `float` โดยไม่มี `ge=0` (greater-than-or-equal-to-zero) → แฮกเกอร์สามารถส่ง Bid ค่าติดลบ เช่น `-999999` เพื่อชนะประมูลด้วยราคาติดลบ หรือสร้าง Invoice จำนวนเงินติดลบเพื่อโกงระบบ
*   **วิธีแก้:** เพิ่ม `Field(gt=0)` หรือ `@field_validator` ในทุกฟิลด์ที่เกี่ยวกับเงิน

### 8. Race Condition ในระบบประมูล (Auction Bid Race Condition)
*   **ไฟล์:** `backend/api/routers/auctions.py` (ฟังก์ชัน `api_place_bid`)
*   **ปัญหา:** ไม่มีการ Lock แถวใน DB ก่อนบันทึก Bid → ผู้ใช้ 2 คนกด Bid พร้อมกัน ทั้งสองอาจผ่าน Validation ด้วยยอดเท่ากัน
*   **วิธีแก้:** ใช้ `SELECT ... FOR UPDATE` หรือ Database-level Constraint

### 9. ไม่มีขีดจำกัดขนาดไฟล์อัปโหลด (Unrestricted File Upload Size / DoS)
*   **ไฟล์:** ทุก API ที่ใช้ `UploadFile` (`portfolio.py`, `orders.py`, `auctions.py`, `characters.py`, `auth.py`)
*   **ปัญหา:** FastAPI ไม่จำกัดขนาดไฟล์ตามค่าเริ่มต้น → อัปโหลดไฟล์ 100GB เพื่อถมฮาร์ดดิสก์ให้เต็มได้
*   **วิธีแก้:** ดักเช็ค `file.size` (เช่น ห้ามเกิน 20MB) ก่อนเซฟลงดิสก์

### 10. ตรวจไฟล์แค่นามสกุล ไม่ตรวจเนื้อหาจริง (File Extension-Only Validation)
*   **ไฟล์:** ทุกจุดที่มีการอัปโหลด
*   **ปัญหา:** โค้ดตรวจแค่นามสกุลไฟล์ (เช่น `.jpg`, `.png`) แต่ไม่ได้ตรวจ Magic Bytes (เนื้อหาจริงของไฟล์) → แฮกเกอร์สามารถเปลี่ยนชื่อ `malware.exe` เป็น `malware.jpg` แล้วอัปโหลดเข้าระบบได้
*   **วิธีแก้:** ใช้ `python-magic` หรืออ่าน File Header (Magic Bytes) ก่อนยอมรับไฟล์

### 11. พื้นที่เซิร์ฟเวอร์เต็มจากไฟล์ขยะ (Storage Leak / Orphaned Files)
*   **ไฟล์:** `portfolio.py`, `characters.py`, `artists.py` (อัปเดตรูป avatar/banner ทับ)
*   **ปัญหา:** (1) ลบ Artwork/Character → ไม่ลบไฟล์รูปบนดิสก์ (2) อัปเดตรูป Avatar/Banner → เซฟรูปใหม่ทับโดยไม่ลบรูปเก่า → ขยะรูปเก่าสะสม
*   **วิธีแก้:** ลบไฟล์เก่าก่อนเซฟไฟล์ใหม่ทุกครั้ง

### 12. ช่องโหว่ XSS จากการเก็บ Token ขาหน้าบ้าน
*   **ไฟล์:** `frontend/src/components/AuthContext.tsx`
*   **ปัญหา:** Token ถูกเก็บใน `localStorage` ซึ่งเสี่ยงต่อ XSS
*   **วิธีแก้:** ให้ Backend ส่ง Token ผ่าน **HttpOnly Cookie**

---

## 🟡 ระดับกลาง (MEDIUM) - ปัญหาคอขวด, UX, DevOps

### 13. สถาปัตยกรรม WebSocket สเกลไม่ได้ (Stateful WebSocket)
*   **ไฟล์:** `backend/core/websocket.py`
*   **ปัญหา:** เก็บ Connection ใน Memory → รัน Multi-Worker จะทำให้แชทข้ามเซิร์ฟเวอร์ไม่ได้
*   **วิธีแก้:** ใช้ Redis Pub/Sub

### 14. ข้อมูลพังจากลำดับการลบไฟล์ (Data Integrity Risk)
*   **ไฟล์:** `backend/api/routers/orders.py` (ฟังก์ชัน `delete_order_file`)
*   **ปัญหา:** ลบไฟล์จริงก่อน commit DB → ถ้า commit ล้มเหลว ข้อมูลไม่ตรงกัน
*   **วิธีแก้:** commit DB ก่อน แล้วค่อยลบไฟล์

### 15. ประมูลจบ → Order ผูกศิลปินผิดคน (Missing artist_id on Auction Order)
*   **ไฟล์:** `backend/services/auction_service.py` (บรรทัด 37-44)
*   **ปัญหา:** สร้าง Order หลังประมูลจบโดยลืมระบุ `artist_id` → ใช้ค่า Default `1` ซึ่งอาจเป็นคนผิด
*   **วิธีแก้:** ดึง `artist_id` จาก `auction.artist_id` → ค้น `user_id` จาก ArtistProfile

### 16. Token หมดอายุแล้วหน้าเว็บกลายเป็นผี (Missing Global 401 Handler)
*   **ไฟล์:** `frontend/src/lib/api.ts`
*   **ปัญหา:** ไม่มี `axios.interceptors.response` ดักจับ 401 → หน้าเว็บพังเงียบๆ ไม่เด้งกลับหน้า Login
*   **วิธีแก้:** เพิ่ม Response Interceptor ให้ลบ Token และ Redirect ไป `/login`

### 17. WebSocket หน้าบ้านยิงสแปม (Infinite Reconnect Loop)
*   **ไฟล์:** `frontend/src/components/WebSocketContext.tsx`
*   **ปัญหา:** Token หมดอายุ → Reconnect ทุก 5 วินาทีแบบไม่มีเงื่อนไขหยุด → ยิงขยะเข้าเซิร์ฟเวอร์ตลอดเวลา
*   **วิธีแก้:** เช็ค Close Code ถ้าเป็น Auth Failed → หยุด Reconnect

### 18. ปัญหา N+1 Query โหลดหน้าโปรไฟล์ช้า
*   **ไฟล์:** `backend/api/routers/artists.py`
*   **ปัญหา:** โปรไฟล์ 1 คน → Query DB 54 ครั้ง (Profile + Services + Reviews + Artworks + Characters ทีละตัว)
*   **วิธีแก้:** ใช้ `selectinload` / `joinedload`

### 19. อาการค้างตอนประทับลายน้ำ (Blocking Image Processing)
*   **ไฟล์:** `backend/api/routers/orders.py`
*   **ปัญหา:** Pillow ประมวลผลลายน้ำแบบ Synchronous → อัปโหลดภาพใหญ่ หน้าจอค้างหลายวินาที
*   **วิธีแก้:** โยนไป `BackgroundTasks`

### 20. โดนสแปมแจ้งเตือน (Notification Loop)
*   **ไฟล์:** `backend/api/routers/orders.py`
*   **ปัญหา:** ทุกข้อความแชท → วนลูปสร้าง Notification ให้ Admin ทุกคน
*   **วิธีแก้:** ใช้ WebSocket อย่างเดียวสำหรับแชท ไม่ทริกเกอร์ Notification กระดิ่ง

### 21. ขาด Pagination ทั้งระบบ (Missing Pagination)
*   **ปัญหาหลายไฟล์:** ดึงข้อมูลด้วย `.all()` รวดเดียว
*   **วิธีแก้:** เพิ่ม `limit` / `offset` Query Parameters

### 22. ลบผู้ใช้ทิ้งขยะ (Missing Cascading Deletes)
*   **ไฟล์:** `backend/models/*.py`
*   **ปัญหา:** ไม่มี `ondelete="CASCADE"` → ข้อมูลกำพร้าลอยเคว้งหลังลบ User
*   **วิธีแก้:** เติม `ondelete="CASCADE"` ใน Foreign Key

### 23. CORS เปิดกว้างเกินไป (Overly Permissive CORS)
*   **ไฟล์:** `backend/main.py`
*   **ปัญหา:** `allow_origins=["*"]`
*   **วิธีแก้:** จำกัดให้เหลือแค่ Domain ของคุณ

### 24. ใช้ `datetime.utcnow()` ที่ถูก Deprecate
*   **ไฟล์:** หลายไฟล์ทั่วระบบ
*   **ปัญหา:** Deprecate ตั้งแต่ Python 3.12 → คืนค่า Naive Datetime ที่ไม่มี Timezone → เวลาปิดประมูลอาจผิดพลาด
*   **วิธีแก้:** เปลี่ยนเป็น `datetime.now(timezone.utc)`

### 25. ไม่มี Logging/Monitoring ทั้งระบบ (No Centralized Logging)
*   **ไฟล์:** ทุกไฟล์ใน `backend/api/routers/`
*   **ปัญหา:** ทั้งระบบใช้ `print()` แทน `logging` (ยกเว้น `notification_service.py` ที่ Import มาแต่ไม่ได้ใช้) ทำให้ไม่มี Log ใดๆ ถูกบันทึกเลย — เวลาระบบมีปัญหา (เช่น Error 500) ผู้ดูแลเซิร์ฟเวอร์จะไม่รู้เลยว่าเกิดอะไรขึ้น ไม่มีร่องรอยให้ตามสาเหตุ (Forensics) ได้เลย
*   **วิธีแก้:** ใช้ `logging` module พร้อม Middleware จับ Exception แทน `print()` ทั้งหมด

### 26. Hardcode Seed Password (Credential Exposure in Source Code)
*   **ไฟล์:** `backend/main.py` (บรรทัด 41, 62, 103)
*   **ปัญหา:** โค้ด Startup สร้างบัญชี Seed ด้วยรหัสผ่าน `"password123"` แบบ Hardcode → ถ้าลืมลบหรือเปลี่ยนก่อนขึ้น Production แฮกเกอร์แค่ลองล็อกอินด้วย `admin@example.com` / `password123` ก็เป็น Admin ได้ทันที
*   **วิธีแก้:** ให้ Seed Script โหลดรหัสผ่านจาก Environment Variable หรือสร้างรหัสผ่านแบบ Random แล้วพิมพ์ออกมาให้ผู้ดูแลระบบเก็บไว้

### 27. ข้อมูลการเงินใช้ Float (Floating-Point Money Precision)
*   **ไฟล์:** `backend/models/order.py`, `backend/models/auction.py`
*   **ปัญหา:** ฟิลด์เงินทุกตัว (`amount`, `agreed_price`, `starting_bid`, `winning_bid`) ถูกกำหนดเป็น `float` ซึ่งมี Precision Error (เช่น `0.1 + 0.2 = 0.30000000000000004`) → เมื่อรวมยอด Invoice หรือคำนวณรายได้ใน Analytics ตัวเลขอาจผิดเพี้ยนไปเล็กน้อย (เช่น รายได้รวม 10,000.01 แทนที่จะเป็น 10,000.00)
*   **วิธีแก้:** เปลี่ยนเป็น `Decimal` หรือเก็บเป็น "สตางค์" (`int` — เช่น 10000 = 100.00 บาท) แล้วแปลงกลับเวลาแสดงผล

### 28. ข้อมูลส่วนตัวรั่วไหลจาก API สาธารณะ (Information Disclosure)
*   **ไฟล์:** `backend/api/routers/orders.py` (ฟังก์ชัน `get_public_queue`)
*   **ปัญหา:** API คิวงานสาธารณะ `/api/public/queue` ส่ง `client_id`, `client_name`, `title` ของออเดอร์ทุกตัวออกไปโดยไม่ต้องล็อกอิน → ทุกคนบนอินเตอร์เน็ตสามารถเห็นว่า "ใครสั่งงานอะไร" ได้ ซึ่งลูกค้าบางคนอาจไม่ต้องการเปิดเผย
*   **วิธีแก้:** ซ่อน `client_id` และ Mask ชื่อลูกค้าให้แสดงแค่ตัวอักษรแรก (เช่น "S***") หรือให้ลูกค้าเลือกได้ว่าจะเปิดเผยหรือไม่
