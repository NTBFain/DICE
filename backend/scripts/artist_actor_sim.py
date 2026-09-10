#!/usr/bin/env python3
"""
Artist Actor Agent Simulation Script for DICE Platform (http://localhost:8000)
Performs the full 13-step lifecycle for @main_artist:
1. Log in as artist@example.com
2. Poll for new commission order created by client
3. Accept order (agreed_price=5000.00, revision_quota=3, start/due dates)
4. Transition order status to SKETCHING
5. Issue Milestone Invoice 1: '50% Initial Sketch Deposit' (2500.00)
6. Wait for client slip upload & approve Invoice 1
7. Upload WIP sketch with Anti-AI watermark
8. Wait for revision request, reply in chat, resolve revision
9. Transition order status to COLORING
10. Issue Milestone Invoice 2: '50% Final Color & Layered Balance' (2500.00)
11. Wait for client slip upload & approve Invoice 2
12. Upload FINAL deliverable
13. Complete order (status -> COMPLETED)
"""

import time
import datetime
import io
import httpx
from PIL import Image, ImageDraw

BASE_URL = "http://localhost:8000"
ARTIST_EMAIL = "artist@example.com"
ARTIST_PASSWORD = "password123"

def create_sample_image(text: str, color=(70, 130, 180), size=(800, 800)) -> bytes:
    img = Image.new("RGB", size, color=color)
    draw = ImageDraw.Draw(img)
    draw.text((50, 50), text, fill=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

def run_artist_actor_flow():
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)
    audit_logs = []

    def log(step_num: int, name: str, method: str, endpoint: str, status_code: int, payload=None, response=None):
        ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
        entry = {
            "step": step_num,
            "name": name,
            "timestamp": ts,
            "method": method,
            "endpoint": endpoint,
            "status_code": status_code,
            "payload": payload,
            "response": response
        }
        audit_logs.append(entry)
        print(f"[{ts}] Step {step_num}: {name} -> {method} {endpoint} ({status_code})")

    # Step 1: Login
    login_resp = client.post("/api/auth/login", json={"email": ARTIST_EMAIL, "password": ARTIST_PASSWORD})
    log(1, "Artist Login", "POST", "/api/auth/login", login_resp.status_code, {"email": ARTIST_EMAIL}, login_resp.json() if login_resp.is_success else login_resp.text)
    if not login_resp.is_success:
        raise RuntimeError(f"Login failed: {login_resp.text}")
    
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 2: Poll for pending commission order
    order_id = None
    target_order = None
    max_poll = 30
    for poll_idx in range(max_poll):
        orders_resp = client.get("/api/orders", headers=headers)
        log(2, f"Poll Orders (Attempt {poll_idx+1})", "GET", "/api/orders", orders_resp.status_code)
        if orders_resp.is_success:
            orders = orders_resp.json()
            # Find latest pending order or latest active order
            pending_orders = [o for o in orders if o.get("status") == "PENDING"]
            if pending_orders:
                target_order = pending_orders[-1]
                order_id = target_order["id"]
                print(f"Found Pending Order #{order_id}: '{target_order.get('title')}'")
                break
        time.sleep(2)

    if not order_id:
        # Fallback to latest order if any exists
        orders_resp = client.get("/api/orders", headers=headers)
        if orders_resp.is_success and orders_resp.json():
            target_order = orders_resp.json()[-1]
            order_id = target_order["id"]
            print(f"Using Latest Order #{order_id}: '{target_order.get('title')}' (Status: {target_order.get('status')})")

    if not order_id:
        print("No order found to process.")
        return audit_logs

    now = datetime.datetime.now(datetime.timezone.utc)
    start_date = now.isoformat()
    due_date = (now + datetime.timedelta(days=14)).isoformat()

    # Step 3: Accept the order
    accept_payload = {
        "status": "ACCEPTED",
        "agreed_price": 5000.00,
        "revision_quota": 3,
        "start_date": start_date,
        "due_date": due_date
    }
    accept_resp = client.patch(f"/api/orders/{order_id}", json=accept_payload, headers=headers)
    log(3, "Accept Commission Order", "PATCH", f"/api/orders/{order_id}", accept_resp.status_code, accept_payload, accept_resp.json())

    # Step 4: Transition to SKETCHING
    sketching_resp = client.patch(f"/api/orders/{order_id}", json={"status": "SKETCHING"}, headers=headers)
    log(4, "Transition to SKETCHING", "PATCH", f"/api/orders/{order_id}", sketching_resp.status_code, {"status": "SKETCHING"}, sketching_resp.json())

    # Step 5: Issue Milestone Invoice 1 (50% Deposit = 2500)
    inv1_payload = {
        "title": "50% Initial Sketch Deposit",
        "amount": 2500.00
    }
    inv1_resp = client.post(f"/api/orders/{order_id}/invoices", json=inv1_payload, headers=headers)
    log(5, "Issue Milestone Invoice 1", "POST", f"/api/orders/{order_id}/invoices", inv1_resp.status_code, inv1_payload, inv1_resp.json())
    inv1_id = inv1_resp.json().get("id")

    # Step 6: Poll for slip upload & Approve Invoice 1
    print("Waiting for client payment slip upload for Invoice 1...")
    for _ in range(30):
        inv_check = client.get(f"/api/orders/{order_id}/invoices", headers=headers)
        if inv_check.is_success:
            invoices = inv_check.json()
            target_inv = next((i for i in invoices if i["id"] == inv1_id), None)
            if target_inv and target_inv.get("slip_image_url"):
                print(f"Payment slip detected: {target_inv['slip_image_url']}")
                break
        time.sleep(2)

    appr1_resp = client.post(f"/api/invoices/{inv1_id}/approve", headers=headers)
    log(6, "Approve Invoice 1 Payment", "POST", f"/api/invoices/{inv1_id}/approve", appr1_resp.status_code, None, appr1_resp.json())

    # Step 7: Upload WIP sketch file
    sketch_bytes = create_sample_image(f"WIP Sketch - Order #{order_id}\nArtist Studio @main_artist", color=(60, 60, 90))
    files_wip = {"file": ("wip_sketch_concept.png", sketch_bytes, "image/png")}
    data_wip = {"file_type": "WIP"}
    wip_resp = client.post(f"/api/orders/{order_id}/files", data=data_wip, files=files_wip, headers=headers)
    log(7, "Upload WIP Sketch", "POST", f"/api/orders/{order_id}/files", wip_resp.status_code, {"file_type": "WIP"}, wip_resp.json())

    # Step 8: Wait for revision request, reply in chat, resolve revision
    print("Waiting for client revision request...")
    revision_id = None
    for _ in range(30):
        rev_check = client.get(f"/api/orders/{order_id}/revisions", headers=headers)
        if rev_check.is_success and rev_check.json():
            open_revs = [r for r in rev_check.json() if not r.get("is_addressed")]
            if open_revs:
                revision_id = open_revs[0]["id"]
                print(f"Found Client Revision #{revision_id}: {open_revs[0].get('client_feedback')}")
                break
        time.sleep(2)

    # Chat response
    chat_payload = {"content": "Understood! Adjusting hair highlights and katana sheath now."}
    chat_resp = client.post(f"/api/orders/{order_id}/messages", json=chat_payload, headers=headers)
    log(8, "Order Chat Response", "POST", f"/api/orders/{order_id}/messages", chat_resp.status_code, chat_payload, chat_resp.json())

    if revision_id:
        resolve_resp = client.post(f"/api/revisions/{revision_id}/resolve", headers=headers)
        log(8, "Resolve Revision", "POST", f"/api/revisions/{revision_id}/resolve", resolve_resp.status_code, None, resolve_resp.json())

    # Step 9: Transition to COLORING
    coloring_resp = client.patch(f"/api/orders/{order_id}", json={"status": "COLORING"}, headers=headers)
    log(9, "Transition to COLORING", "PATCH", f"/api/orders/{order_id}", coloring_resp.status_code, {"status": "COLORING"}, coloring_resp.json())

    # Step 10: Issue Milestone Invoice 2 (50% Final Balance = 2500)
    inv2_payload = {
        "title": "50% Final Color & Layered Balance",
        "amount": 2500.00
    }
    inv2_resp = client.post(f"/api/orders/{order_id}/invoices", json=inv2_payload, headers=headers)
    log(10, "Issue Milestone Invoice 2", "POST", f"/api/orders/{order_id}/invoices", inv2_resp.status_code, inv2_payload, inv2_resp.json())
    inv2_id = inv2_resp.json().get("id")

    # Step 11: Poll for slip upload & Approve Invoice 2
    print("Waiting for client payment slip upload for Invoice 2...")
    for _ in range(30):
        inv_check = client.get(f"/api/orders/{order_id}/invoices", headers=headers)
        if inv_check.is_success:
            invoices = inv_check.json()
            target_inv = next((i for i in invoices if i["id"] == inv2_id), None)
            if target_inv and target_inv.get("slip_image_url"):
                print(f"Payment slip 2 detected: {target_inv['slip_image_url']}")
                break
        time.sleep(2)

    appr2_resp = client.post(f"/api/invoices/{inv2_id}/approve", headers=headers)
    log(11, "Approve Invoice 2 Payment", "POST", f"/api/invoices/{inv2_id}/approve", appr2_resp.status_code, None, appr2_resp.json())

    # Step 12: Upload Final Deliverable File
    final_bytes = create_sample_image(f"FINAL DELIVERABLE 300 DPI\nOrder #{order_id} - Full Resolution Masterpiece\nArtist: @main_artist", color=(20, 100, 60), size=(2000, 2000))
    files_final = {"file": ("final_deliverable_highres.png", final_bytes, "image/png")}
    data_final = {"file_type": "FINAL"}
    final_resp = client.post(f"/api/orders/{order_id}/files", data=data_final, files=files_final, headers=headers)
    log(12, "Upload Final Deliverable", "POST", f"/api/orders/{order_id}/files", final_resp.status_code, {"file_type": "FINAL"}, final_resp.json())

    # Step 13: Complete Order
    complete_payload = {"status": "COMPLETED"}
    complete_resp = client.patch(f"/api/orders/{order_id}", json=complete_payload, headers=headers)
    log(13, "Complete Commission Order", "PATCH", f"/api/orders/{order_id}", complete_resp.status_code, complete_payload, complete_resp.json())

    print("\n==========================================")
    print("Commission Lifecycle Simulation Completed!")
    print("==========================================")
    return audit_logs

if __name__ == "__main__":
    run_artist_actor_flow()
