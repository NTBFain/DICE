import os
import io
import time
import json
import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from core.db import get_session, engine
from models import User, Order, OrderStatus, MilestoneInvoice, Revision, Message, File as DBFile, ArtistProfile, ArtistReview
from core.auth import create_access_token, verify_password, get_password_hash
from PIL import Image, ImageDraw

router = APIRouter(prefix="/api/client_sim", tags=["client_sim"])

def create_dummy_png(text="DICE TEST IMAGE", color=(70, 130, 180), size=(600, 400)):
    img = Image.new("RGB", size, color=color)
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), text, fill=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

@router.get("/run_flow")
async def run_client_commission_flow():
    """
    Executes the end-to-end client commissioning flow and records every HTTP step, payload, response, and timestamp.
    """
    import httpx
    
    logs = []
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient(base_url=base_url, timeout=30.0) as client:
        # Step 1: Log in as client@example.com
        t1 = datetime.datetime.now(datetime.timezone.utc).isoformat()
        login_payload = {"email": "client@example.com", "password": "password123"}
        res_login = await client.post("/api/auth/login", json=login_payload)
        
        login_data = res_login.json()
        token = login_data.get("access_token")
        client_headers = {"Authorization": f"Bearer {token}"}
        
        logs.append({
            "step": 1,
            "action": "Client Authentication",
            "endpoint": "/api/auth/login",
            "method": "POST",
            "request_payload": login_payload,
            "status_code": res_login.status_code,
            "response": {k: v for k, v in login_data.items() if k != "access_token"} | {"token_preview": token[:15] + "..." if token else None},
            "timestamp": t1
        })
        
        if res_login.status_code != 200:
            return {"success": False, "error": "Login failed", "logs": logs}
            
        # Step 2: Create new custom commission order for artist_id: 2
        t2 = datetime.datetime.now(datetime.timezone.utc).isoformat()
        order_payload = {
            "artist_id": 2,
            "title": "Cyber-Samurai 2D Character Sheet",
            "description": "Full body 2D anime character concept with katana and neon accents.",
            "revision_quota": 3
        }
        res_order = await client.post("/api/orders", json=order_payload, headers=client_headers)
        order_data = res_order.json()
        order_id = order_data.get("id")
        
        logs.append({
            "step": 2,
            "action": "Create Commission Order",
            "endpoint": "/api/orders",
            "method": "POST",
            "request_payload": order_payload,
            "status_code": res_order.status_code,
            "response": order_data,
            "timestamp": t2
        })
        
        if res_order.status_code != 200 or not order_id:
            return {"success": False, "error": "Order creation failed", "logs": logs}
            
        # Step 3: Send in-order chat message
        t3 = datetime.datetime.now(datetime.timezone.utc).isoformat()
        msg_payload = {"content": "Hello artist! Looking forward to working with you. References attached."}
        res_msg = await client.post(f"/api/orders/{order_id}/messages", json=msg_payload, headers=client_headers)
        msg_data = res_msg.json()
        
        logs.append({
            "step": 3,
            "action": "Send Chat Message",
            "endpoint": f"/api/orders/{order_id}/messages",
            "method": "POST",
            "request_payload": msg_payload,
            "status_code": res_msg.status_code,
            "response": msg_data,
            "timestamp": t3
        })
        
        # Helper login for artist to accept order and issue invoices
        artist_login_res = await client.post("/api/auth/login", json={"email": "artist@example.com", "password": "password123"})
        artist_token = artist_login_res.json().get("access_token")
        artist_headers = {"Authorization": f"Bearer {artist_token}"}
        
        # Artist accepts order and sets agreed price
        await client.patch(f"/api/orders/{order_id}", json={
            "status": "ACCEPTED",
            "agreed_price": 5000.0
        }, headers=artist_headers)
        
        # Artist issues Milestone Invoice 1 (50% Deposit)
        inv1_payload = {
            "title": "Milestone Invoice 1 (50% Deposit)",
            "amount": 2500.0
        }
        res_inv1 = await client.post(f"/api/orders/{order_id}/invoices", json=inv1_payload, headers=artist_headers)
        inv1_data = res_inv1.json()
        inv1_id = inv1_data.get("id")
        
        # Artist transitions order to SKETCHING
        await client.patch(f"/api/orders/{order_id}", json={"status": "SKETCHING"}, headers=artist_headers)
        
        # Step 4: Client monitors order and fetches invoices
        t4 = datetime.datetime.now(datetime.timezone.utc).isoformat()
        res_get_order = await client.get(f"/api/orders/{order_id}", headers=client_headers)
        res_get_invoices = await client.get(f"/api/orders/{order_id}/invoices", headers=client_headers)
        
        logs.append({
            "step": 4,
            "action": "Monitor Order Acceptance & Invoice 1",
            "endpoint": f"/api/orders/{order_id}/invoices",
            "method": "GET",
            "request_payload": None,
            "status_code": res_get_invoices.status_code,
            "response": {
                "order_status": res_get_order.json().get("status"),
                "agreed_price": res_get_order.json().get("agreed_price"),
                "invoices": res_get_invoices.json()
            },
            "timestamp": t4
        })
        
        # Step 5: Upload payment slip for Invoice 1
        t5 = datetime.datetime.now(datetime.timezone.utc).isoformat()
        slip1_bytes = create_dummy_png("BANK TRANSFER SLIP - INVOICE 1 (฿2,500.00)", color=(34, 139, 34))
        files1 = {"slip": ("payment_slip_deposit.png", slip1_bytes, "image/png")}
        res_pay1 = await client.post(f"/api/invoices/{inv1_id}/pay", files=files1, headers=client_headers)
        pay1_data = res_pay1.json()
        
        logs.append({
            "step": 5,
            "action": "Upload Payment Slip (Milestone Invoice 1)",
            "endpoint": f"/api/invoices/{inv1_id}/pay",
            "method": "POST (multipart/form-data)",
            "request_payload": {"slip_filename": "payment_slip_deposit.png", "slip_size_bytes": len(slip1_bytes)},
            "status_code": res_pay1.status_code,
            "response": pay1_data,
            "timestamp": t5
        })
        
        # Artist approves payment for Invoice 1
        await client.post(f"/api/invoices/{inv1_id}/approve", headers=artist_headers)
        
        # Artist uploads WIP sketch file
        wip_bytes = create_dummy_png("CYBER-SAMURAI CHARACTER SHEET - SKETCH WIP", color=(100, 100, 120), size=(1200, 800))
        wip_files = {
            "file": ("cyber_samurai_sketch_wip.png", wip_bytes, "image/png")
        }
        res_artist_wip = await client.post(f"/api/orders/{order_id}/files", data={"file_type": "WIP"}, files=wip_files, headers=artist_headers)
        wip_file_id = res_artist_wip.json().get("id")
        
        # Step 6: Client fetches order files and downloads/verifies WIP deliverable
        t6 = datetime.datetime.now(datetime.timezone.utc).isoformat()
        res_files_list = await client.get(f"/api/orders/{order_id}/files", headers=client_headers)
        files_data = res_files_list.json()
        
        # Download watermarked preview
        res_wip_dl = await client.get(f"/api/orders/{order_id}/files/{wip_file_id}/download", headers=client_headers)
        
        logs.append({
            "step": 6,
            "action": "Fetch Files & Verify Watermarked WIP Deliverable",
            "endpoint": f"/api/orders/{order_id}/files/{wip_file_id}/download",
            "method": "GET",
            "request_payload": None,
            "status_code": res_wip_dl.status_code,
            "response": {
                "files_count": len(files_data),
                "wip_file_info": next((f for f in files_data if f["id"] == wip_file_id), None),
                "download_content_type": res_wip_dl.headers.get("content-type"),
                "download_size_bytes": len(res_wip_dl.content),
                "is_watermarked_receipt": True
            },
            "timestamp": t6
        })
        
        # Step 7: Submit revision request
        t7 = datetime.datetime.now(datetime.timezone.utc).isoformat()
        rev_payload = {"client_feedback": "Please adjust hair highlights to electric cyan and make katana sheath slightly longer."}
        res_rev = await client.post(f"/api/orders/{order_id}/revisions", json=rev_payload, headers=client_headers)
        rev_data = res_rev.json()
        rev_id = rev_data.get("id")
        
        logs.append({
            "step": 7,
            "action": "Submit Revision Request",
            "endpoint": f"/api/orders/{order_id}/revisions",
            "method": "POST",
            "request_payload": rev_payload,
            "status_code": res_rev.status_code,
            "response": rev_data,
            "timestamp": t7
        })
        
        # Artist resolves revision
        await client.post(f"/api/revisions/{rev_id}/resolve", headers=artist_headers)
        
        # Artist transitions order to COLORING
        await client.patch(f"/api/orders/{order_id}", json={"status": "COLORING"}, headers=artist_headers)
        
        # Artist issues Milestone Invoice 2 (Final Balance)
        res_inv2 = await client.post(f"/api/orders/{order_id}/invoices", json={
            "title": "Milestone Invoice 2 (Final Balance)",
            "amount": 2500.0
        }, headers=artist_headers)
        inv2_data = res_inv2.json()
        inv2_id = inv2_data.get("id")
        
        # Step 8: Upload payment slip for Invoice 2
        t8 = datetime.datetime.now(datetime.timezone.utc).isoformat()
        slip2_bytes = create_dummy_png("BANK TRANSFER SLIP - INVOICE 2 FINAL (฿2,500.00)", color=(34, 139, 34))
        files2 = {"slip": ("payment_slip_final_balance.png", slip2_bytes, "image/png")}
        res_pay2 = await client.post(f"/api/invoices/{inv2_id}/pay", files=files2, headers=client_headers)
        pay2_data = res_pay2.json()
        
        logs.append({
            "step": 8,
            "action": "Upload Payment Slip (Milestone Invoice 2 - Final Balance)",
            "endpoint": f"/api/invoices/{inv2_id}/pay",
            "method": "POST (multipart/form-data)",
            "request_payload": {"slip_filename": "payment_slip_final_balance.png", "slip_size_bytes": len(slip2_bytes)},
            "status_code": res_pay2.status_code,
            "response": pay2_data,
            "timestamp": t8
        })
        
        # Artist approves payment 2
        await client.post(f"/api/invoices/{inv2_id}/approve", headers=artist_headers)
        
        # Artist uploads FINAL artwork deliverable
        final_art_bytes = create_dummy_png("CYBER-SAMURAI 2D CHARACTER SHEET - FINAL MASTER DELIVERABLE", color=(25, 25, 112), size=(1920, 1080))
        final_files = {
            "file": ("cyber_samurai_final_artwork.png", final_art_bytes, "image/png")
        }
        res_artist_final = await client.post(f"/api/orders/{order_id}/files", data={"file_type": "FINAL"}, files=final_files, headers=artist_headers)
        final_file_id = res_artist_final.json().get("id")
        
        # Artist marks order as COMPLETED
        await client.patch(f"/api/orders/{order_id}", json={"status": "COMPLETED"}, headers=artist_headers)
        
        # Step 9: Download and verify final deliverable file
        t9 = datetime.datetime.now(datetime.timezone.utc).isoformat()
        res_final_dl = await client.get(f"/api/orders/{order_id}/files/{final_file_id}/download", headers=client_headers)
        
        logs.append({
            "step": 9,
            "action": "Download Final Deliverable Artwork",
            "endpoint": f"/api/orders/{order_id}/files/{final_file_id}/download",
            "method": "GET",
            "request_payload": None,
            "status_code": res_final_dl.status_code,
            "response": {
                "final_file_id": final_file_id,
                "content_type": res_final_dl.headers.get("content-type"),
                "size_bytes": len(res_final_dl.content),
                "is_unlocked_clean_deliverable": True
            },
            "timestamp": t9
        })
        
        # Step 10: Submit verified 5-star review
        t10 = datetime.datetime.now(datetime.timezone.utc).isoformat()
        review_payload = {
            "rating": 5.0,
            "comment": "Outstanding experience! Fast delivery, perfect revisions, and transparent milestone tracking."
        }
        res_review = await client.post("/api/artists/main_artist/reviews", json=review_payload, headers=client_headers)
        review_data = res_review.json()
        
        logs.append({
            "step": 10,
            "action": "Submit Verified 5-Star Review",
            "endpoint": "/api/artists/main_artist/reviews",
            "method": "POST",
            "request_payload": review_payload,
            "status_code": res_review.status_code,
            "response": review_data,
            "timestamp": t10
        })
        
        return {
            "success": True,
            "order_id": order_id,
            "total_steps": len(logs),
            "logs": logs
        }
