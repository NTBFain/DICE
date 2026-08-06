# 🛠️ DICE Platform: Remediation Plan (Zero Breaking Changes)

แผนการแก้ไขนี้ถูกออกแบบมาเพื่ออุดช่องโหว่ทั้ง 28 ข้อ โดย **ไม่เปลี่ยนโครงสร้าง API เดิม (No Breaking Changes)** หน้าบ้าน (Frontend) ยังสามารถเรียกใช้ API ได้ด้วย Payload เดิมทุกประการ เพื่อให้สามารถทยอยแก้ไขและอัปเดตระบบได้ทันทีโดยไม่กระทบผู้ใช้งานปัจจุบัน

---

## 🟢 Phase 1: Quick Wins & Critical Bug Fixes (ใช้เวลา 1-2 วัน)
*เป้าหมาย: แก้ไขบั๊กที่ทำให้ระบบแครช และช่องโหว่ความปลอดภัยที่ร้ายแรงที่สุด โดยแก้เพียงไม่กี่บรรทัด*

1. **เปิดใช้งาน Foreign Key Constraints** (Issue #1)
   - **Action:** เติม `cursor.execute("PRAGMA foreign_keys=ON")` ใน `backend/core/db.py`
   - **Impact:** ป้องกันข้อมูลกำพร้าในอนาคต (ไม่มีผลกระทบกับข้อมูลเดิม)
2. **แก้บั๊ก NameError ระบบประมูลและแชท** (Issue #2, #3, #4)
   - **Action:** ลบเงื่อนไข `if not artist_user.is_admin:` ที่ผิดพลาดออก และลบ Unreachable Code ออกจาก `backend/api/routers/auctions.py`
   - **Impact:** ระบบประมูลและแชทกลับมาทำงานได้ 100% ตามที่ควรจะเป็น
3. **ป้องกันช่องโหว่ JWT Secret** (Issue #5)
   - **Action:** แก้ไข `SECRET_KEY` ใน `core/config.py` ให้ดึงจาก `os.getenv("SECRET_KEY")` และ Throw Error ถ้าหาไม่เจอ
   - **Impact:** ยกระดับความปลอดภัยทันที
4. **ปิดช่องโหว่เพิ่มแพ็กเกจศิลปินอื่น** (Issue #6)
   - **Action:** เพิ่ม `Depends(get_current_user)` ในฟังก์ชัน `add_artist_service`
   - **Impact:** ป้องกันการกลั่นแกล้งเพิ่มแพ็กเกจแปลกปลอมให้ศิลปินคนอื่น
5. **แก้บั๊กเงินติดลบ (Negative Amount Injection)** (Issue #7)
   - **Action:** เพิ่ม `@field_validator` ใน Schema ของ Auction และ Order เพื่อดักจับค่า `amount < 0`
   - **Impact:** Payload ยังเหมือนเดิม แค่ปฏิเสธ Request ที่มีเจตนาร้าย

---

## 🟡 Phase 2: Security, File Management, & Database Integrity (ใช้เวลา 3-5 วัน)
*เป้าหมาย: อุดช่องโหว่การอัปโหลดไฟล์ และจัดการข้อมูลกำพร้าในฐานข้อมูล*

1. **จำกัดขนาดและประเภทไฟล์ (File Size & Magic Bytes)** (Issue #9, #10)
   - **Action:** สร้างฟังก์ชัน Utility `validate_upload_file(file, max_size)` เพื่อเช็คขนาดไฟล์และอ่าน Magic Bytes พื้นฐานก่อนเริ่มกระบวนการบันทึก
   - **Impact:** ป้องกันเซิร์ฟเวอร์ดิสก์เต็มจากการโจมตี DoS
2. **จัดการไฟล์กำพร้าและข้อมูลพัง** (Issue #11, #12, #14)
   - **Action:** ปรับลำดับการทำงานของ API อัปโหลด/ลบไฟล์ โดยสั่ง `session.commit()` ให้ผ่านก่อน ค่อยเรียก `os.remove()` ผ่าน Background Task หรือลบในบล็อก `try-finally`
   - **Impact:** ดิสก์เซิร์ฟเวอร์จะไม่บวมจากไฟล์ขยะอีกต่อไป
3. **เพิ่ม `ondelete="CASCADE"`** (Issue #22)
   - **Action:** อัปเดต Model ทั้งหมดที่มี Foreign Key ให้รองรับ Cascade Delete
   - **Impact:** เมื่อแอดมินลบผู้ใช้ ขยะที่เกี่ยวข้องจะถูกลบทิ้งคลีนๆ
4. **แก้บั๊ก Order ผูกศิลปินผิดคน** (Issue #15)
   - **Action:** แก้ไข `auction_service.py` ให้ดึง `artist_id` มาใส่ตอนสร้าง Order
   - **Impact:** ออเดอร์จากประมูลจะลิงก์ไปหาศิลปินถูกต้อง

---

## 🟠 Phase 3: Performance, Scalability & DevOps (ใช้เวลา 5-7 วัน)
*เป้าหมาย: ทำให้ระบบรับโหลดคนจำนวนมากได้ และปรับให้พร้อมขึ้น Production (DevOps)*

1. **แก้ N+1 Query และเพิ่ม Pagination** (Issue #18, #21)
   - **Action:** ใช้ `selectinload` ใน `artists.py` และเพิ่มพารามิเตอร์ `skip`, `limit` ในฟังก์ชัน Get Lists (ตั้ง Default ไว้เพื่อไม่ให้กระทบ Frontend ที่ไม่ได้ส่งมา)
   - **Impact:** หน้าเว็บโหลดเร็วขึ้น 10 เท่า ใช้ RAM ลดลงมหาศาล
2. **ประทับลายน้ำเบื้องหลัง (Background Watermarking)** (Issue #19)
   - **Action:** ย้ายการประมวลผล Pillow เข้า `BackgroundTasks`
   - **Impact:** API ตอบสนองทันที ผู้ใช้อัปโหลดไฟล์ใหญ่แล้วไม่ค้าง
3. **จัดระเบียบ Timezone และ Logging** (Issue #24, #25)
   - **Action:** เปลี่ยน `utcnow()` เป็น `now(timezone.utc)` และติดตั้งระบบ `logging` ส่วนกลาง
   - **Impact:** ตามร่องรอยบั๊กบน Production ได้ง่ายขึ้น เวลาประมูลแม่นยำขึ้น
4. **แก้ Race Condition ประมูล** (Issue #8)
   - **Action:** ใช้ Optimistic Locking (ใส่ version_id ในตาราง Auction) เพื่อป้องกัน Bid ซ้อน
   - **Impact:** ประมูลยุติธรรม 100%

---

## 🔵 Phase 4: Frontend UX & State Management (ทำควบคู่ไปกับ Phase อื่นได้)
*เป้าหมาย: หน้าบ้านต้องรองรับ Error อย่างสง่างาม และไม่เป็นสแปม*

1. **Global 401 Handler** (Issue #16)
   - **Action:** เพิ่ม `axios.interceptors.response` ใน `api.ts` ถ้าเจอ 401 ให้ล้าง Token และเตะไป `/login`
   - **Impact:** หมดปัญหา "เว็บผี"
2. **หยุดสแปม WebSocket** (Issue #17)
   - **Action:** ดัก Code `4003` ใน `onclose` ของ React ไม่ให้หมุน Loop Reconnect
   - **Impact:** เซิร์ฟเวอร์หายใจสะดวกขึ้น
3. **ซ่อนข้อมูลส่วนตัวหน้าคิวงาน** (Issue #28)
   - **Action:** Backend เบลอชื่อ Client (เช่น S***) หรือซ่อน Field ใน `/api/public/queue`
   - **Impact:** เพิ่ม Privacy ให้ผู้ใช้งาน
