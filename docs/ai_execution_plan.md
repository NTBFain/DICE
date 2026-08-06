# 🤖 AI Strict Execution Manual (DICE Platform)

**⚠️ คำเตือนถึง AI ที่อ่านเอกสารนี้ (To the executing AI):**
- **DO NOT HALLUCINATE:** ห้ามคิดเอง ห้ามปรับแก้โค้ดส่วนอื่นที่ไม่เกี่ยวข้อง ห้ามเปลี่ยนชื่อตัวแปรนอกเหนือจากที่ระบุ
- **STRICT SEARCH/REPLACE:** ให้ค้นหาบล็อก `<SEARCH>` แบบ Exact Match และแทนที่ด้วย `<REPLACE>` เท่านั้น
- อ่าน **Precautions (ข้อควรระวัง)** ก่อนแก้ไขทุกครั้ง

---

## 🟢 PHASE 1: Critical Bug & Security Fixes

### 🚨 [Issue #1] เปิดใช้งาน Foreign Key Constraints
* **Reason:** ป้องกันฐานข้อมูลพัง (Data Integrity) เพราะ SQLite ปิด Foreign Key ไว้เป็นค่าเริ่มต้น
* **Target File:** `backend/core/db.py`
* **Method:** เพิ่ม `PRAGMA foreign_keys=ON`
* **Precautions:** ห้ามลบ `PRAGMA` ตัวอื่นทิ้ง
```text
<SEARCH>
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
</SEARCH>
<REPLACE>
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
</REPLACE>
```

### 🚨 [Issue #2, #3, #4] แก้ NameError ประมูลแครช และลบ Dead Code
* **Reason:** มีการอ้างอิง `artist_user` ที่ไม่ได้ถูกส่งมาใน Parameter ทำให้ API ประมูลและแชทพังทันที (HTTP 500)
* **Target File:** `backend/api/routers/auctions.py`
* **Method:** ลบบล็อก Authorization ที่ผิดพลาดออกทั้งหมด
* **Precautions:** ระวังเรื่อง Indentation (ย่อหน้า) หลังจากการลบ
```text
<SEARCH>
    if not artist_user.is_admin:
        from models import ArtistProfile
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == artist_user.id)).first()
        if not profile or auction.artist_id != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to modify this auction")
</SEARCH>
<REPLACE>
    # Removed invalid artist_user check to prevent NameError
</REPLACE>
```
*(หมายเหตุ: ให้ AI วนลูป Search/Replace บล็อกนี้ให้ครบทั้งในฟังก์ชัน `api_place_bid`, `api_get_auction_messages`, `api_create_auction_message`)*

**ส่วนที่ 2: ลบ Dead Code ท้ายไฟล์**
```text
<SEARCH>
    return msg_response

    
    return response_data
</SEARCH>
<REPLACE>
    return msg_response
</REPLACE>
```

### 🚨 [Issue #5] ป้องกันช่องโหว่ปลอมแปลง JWT Token
* **Reason:** `SECRET_KEY` ถูก Hardcode ทำให้แฮกเกอร์ปลอมตัวเป็น Admin ได้
* **Target File:** `backend/core/config.py`
* **Method:** บังคับให้ pydantic โหลดจาก `.env` โดยตัด default string ทิ้ง
* **Precautions:** ห้ามลบตัวแปรอื่นใน `Settings`
```text
<SEARCH>
    SECRET_KEY: str = "super_secret_key_change_me_in_production_123456"
</SEARCH>
<REPLACE>
    from pydantic import Field
    SECRET_KEY: str = Field(..., description="Must be set in .env")
</REPLACE>
```

### 🚨 [Issue #6] ปิดช่องโหว่เพิ่มแพ็กเกจให้ศิลปินอื่น
* **Reason:** API เปิดเป็น Public แฮกเกอร์ใช้ยิงแพ็กเกจขยะเข้าโปรไฟล์คนอื่นได้
* **Target File:** `backend/api/routers/artists.py`
* **Method:** เพิ่ม dependency `get_current_user` และเช็คเจ้าของ
* **Precautions:** ห้ามเปลี่ยน Response Model
```text
<SEARCH>
def add_artist_service(
    handle: str,
    request: ArtistServiceCreateRequest,
    session: Session = Depends(get_session)
):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.handle == handle)).first()
</SEARCH>
<REPLACE>
def add_artist_service(
    handle: str,
    request: ArtistServiceCreateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.handle == handle)).first()
    if not profile or profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this profile")
</REPLACE>
```

---

## 🔴 PHASE 2: Validation & Business Logic

### 🔴 [Issue #7] ป้องกันเงินติดลบ (Negative Amount Injection)
* **Reason:** Pydantic schema ยอมรับค่า `float` ติดลบ ทำให้แฮกเกอร์ประมูลด้วยเงินติดลบได้
* **Target File 1:** `backend/schemas/auction.py`
* **Target File 2:** `backend/schemas/order.py`
* **Method:** แทรก `Field(gt=0)` ให้ทุกตัวแปรประเภทเงิน
* **Precautions:** ต้อง import `Field` จาก `pydantic` เสมอ
```text
<SEARCH>
class BidCreateRequest(BaseModel):
    amount: float
</SEARCH>
<REPLACE>
from pydantic import BaseModel, Field
class BidCreateRequest(BaseModel):
    amount: float = Field(gt=0)
</REPLACE>
```

### 🔴 [Issue #9, #10] ดักจับขนาดและเนื้อหาไฟล์ (DoS & File Integrity)
* **Reason:** ไม่มีการป้องกันขนาดไฟล์ ทำให้โดนยิงจนเซิร์ฟเวอร์เต็มได้
* **Target File:** `backend/core/utils.py` (ไฟล์ใหม่)
* **Method:** เขียนฟังก์ชัน Middleware กลางสำหรับตรวจเช็ค
* **Precautions:** ให้สร้างไฟล์นี้ และไป Import ใช้ใน `portfolio.py` และ `orders.py` ตอนทำระบบอัปโหลด
```python
from fastapi import UploadFile, HTTPException
async def validate_upload(file: UploadFile, max_mb: int = 10):
    file.file.seek(0, 2)
    size = file.file.tell()
    await file.seek(0)
    if size > max_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large. Max {max_mb}MB.")
    # (Optional) Add Magic Bytes check here using python-magic
```

### 🔴 [Issue #11] ลบรูปทิ้งป้องกันเซิร์ฟเวอร์เต็ม (Storage Leak)
* **Reason:** ลบข้อมูลใน DB แต่ไฟล์รูปยังอยู่บนเครื่อง
* **Target File:** `backend/api/routers/portfolio.py`
* **Method:** ใช้ `os.remove` ทิ้งไฟล์หลังลบ DB สำเร็จ
* **Precautions:** ห้ามแครชถ้าหาไฟล์ไม่เจอ (ใช้ `os.path.exists`)
```text
<SEARCH>
    session.delete(artwork)
    session.commit()
    return {"message": "Artwork deleted"}
</SEARCH>
<REPLACE>
    image_path = artwork.image_url.replace("/api/portfolio/images/", "uploads/portfolio/")
    session.delete(artwork)
    session.commit()
    import os
    if os.path.exists(image_path):
        try:
            os.remove(image_path)
        except Exception:
            pass
    return {"message": "Artwork deleted"}
</REPLACE>
```

---

## 🟡 PHASE 3: Frontend & Data Fixes

### 🟡 [Issue #16] แก้บั๊กเว็บกลายเป็นผีเมื่อ Token หมดอายุ
* **Reason:** Frontend ขาด Global 401 Interceptor ยิง API ไม่ผ่านแล้วเว็บค้าง
* **Target File:** `frontend/src/lib/api.ts`
* **Method:** ติดตั้ง Axios Response Interceptor
* **Precautions:** ห้ามใช้ `useRouter` นอก React Component ให้ใช้ `window.location.href`
```text
<SEARCH>
// Request interceptor to attach authentication token
apiClient.interceptors.request.use((config) => {
</SEARCH>
<REPLACE>
// Global 401 Interceptor
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(err);
  }
);

// Request interceptor to attach authentication token
apiClient.interceptors.request.use((config) => {
</REPLACE>
```

### 🟡 [Issue #17] ปิดระบบ WebSocket ยิงสแปม
* **Reason:** WebSocket หมุน Loop Reconnect ไม่สิ้นสุดเมื่อ Token หมดอายุ
* **Target File:** `frontend/src/components/WebSocketContext.tsx`
* **Method:** เช็ค `event.code === 4003` (รหัส Unauthorized จาก Backend)
* **Precautions:** ให้ `return` ออกจากการรัน `setTimeout`
```text
<SEARCH>
      ws.onclose = (event) => {
        console.log('WebSocket connection closed.');
        setIsConnected(false);
        // Attempt reconnect after 5 seconds if unmounted
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };
</SEARCH>
<REPLACE>
      ws.onclose = (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}`);
        setIsConnected(false);
        if (event.code === 4001 || event.code === 4003) {
            console.warn("WebSocket Unauthorized. Stopping reconnect loop.");
            return;
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };
</REPLACE>
```

### 🟡 [Issue #15] แก้ Order ผูกศิลปินผิดจากงานประมูล
* **Reason:** หลังประมูลจบ ระบบสร้างออเดอร์โดยไม่ได้ใส่ `artist_id` ของศิลปินลงไป (Fallback เป็น 1)
* **Target File:** `backend/services/auction_service.py`
* **Method:** Resolve ค่า User ID จาก ArtistProfile
* **Precautions:** เช็ค `.first()` และ `user_id` ให้ดีก่อนยัดเข้า `Order`
```text
<SEARCH>
            new_order = Order(
                title=order_title,
                description=f"Won from auction '{auction.title}' with bid ${highest_bid.amount}.",
                status=OrderStatus.ACCEPTED,
                agreed_price=highest_bid.amount,
                revision_quota=3,
                client_id=highest_bid.bidder_id
            )
</SEARCH>
<REPLACE>
            # Retrieve real artist user_id
            artist_user_id = 1
            if auction.artist_id:
                from models import ArtistProfile
                profile = session.get(ArtistProfile, auction.artist_id)
                if profile and profile.user_id:
                    artist_user_id = profile.user_id

            new_order = Order(
                title=order_title,
                description=f"Won from auction '{auction.title}' with bid ${highest_bid.amount}.",
                status=OrderStatus.ACCEPTED,
                agreed_price=highest_bid.amount,
                revision_quota=3,
                client_id=highest_bid.bidder_id,
                artist_id=artist_user_id
            )
</REPLACE>
```

---

## 🤖 Instructions for Remaining Issues (18-28):
สำหรับข้อที่เหลือ ให้ AI ใช้หลักการเดียวกัน (Strict Search/Replace) โดยมี Rule พื้นฐานคือ:
- **Issue 18 (N+1 Query):** ให้ใส่ `.options(selectinload(...))` เสมอ ห้ามรัน Lazy Load ในลูป `for`
- **Issue 22 (Cascade):** ในไฟล์ `models/` ทั้งหมดที่มี `foreign_key=` ให้ใส่คู่กับ `ondelete="CASCADE"` เสมอ
- **Issue 24 (Timezone):** `import timezone` จาก `datetime` แล้วใช้ `datetime.now(timezone.utc)` ห้ามใช้ `utcnow()`
- **Issue 26 (Hardcode Password):** ใช้ `os.getenv("ADMIN_SEED_PASSWORD")` ใน `main.py` เท่านั้น
- **Issue 28 (Privacy Leak):** ซ่อน `client_name` ใน `api_public_queue` เป็น `f"{client.full_name[0]}***"` เสมอ
