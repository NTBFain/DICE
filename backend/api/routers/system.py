from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form, File as FormFile
from fastapi.responses import FileResponse as SecureFileResponse
from sqlmodel import Session
import os
import secrets
import shutil

from core.db import get_session
from core.auth import get_admin_user, get_current_user_optional
from models import User, ArtistProfile
from sqlmodel import select
from schemas import CommissionStatusResponse, CommissionStatusUpdateRequest
from services import get_setting, set_setting

router = APIRouter(prefix="/api/commissions", tags=["commissions"])

@router.get("/status", response_model=CommissionStatusResponse)
def get_commission_status(session: Session = Depends(get_session), current_user: User = Depends(get_current_user_optional)):
    if current_user:
        profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == current_user.id)).first()
        if profile:
            return CommissionStatusResponse(open=(profile.commission_status == "OPEN"))
            
    is_open_str = get_setting(session, "commissions_open", "false")
    return CommissionStatusResponse(open=(is_open_str == "true"))

@router.post("/status", response_model=CommissionStatusResponse)
def update_commission_status(request: CommissionStatusUpdateRequest, session: Session = Depends(get_session), admin_user: User = Depends(get_admin_user)):
    profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == admin_user.id)).first()
    if profile:
        profile.commission_status = "OPEN" if request.open else "CLOSED"
        session.add(profile)
        session.commit()
        return CommissionStatusResponse(open=request.open)
        
    val_str = "true" if request.open else "false"
    set_setting(session, "commissions_open", val_str)
    return CommissionStatusResponse(open=request.open)

@router.get("/watermark")
def get_watermark_settings(session: Session = Depends(get_session)):
    return {
        "type": get_setting(session, "watermark_type", "text"),
        "text": get_setting(session, "watermark_text", "WIP DICE #{order_id}"),
        "pattern": get_setting(session, "watermark_pattern", "tiled"),
        "rotation": int(get_setting(session, "watermark_rotation", "-25")),
        "opacity": float(get_setting(session, "watermark_opacity", "0.25")),
        "tile_density": get_setting(session, "watermark_tile_density", "medium"),
        "include_anti_ai_grid": get_setting(session, "watermark_include_anti_ai_grid", "false").lower() == "true",
        "image_path": get_setting(session, "watermark_image_path", ""),
    }

@router.post("/watermark")
def update_watermark_settings(
    type: str = Form("text"),
    text: str = Form(""),
    pattern: str = Form("tiled"),
    rotation: int = Form(-25),
    opacity: float = Form(0.25),
    tile_density: str = Form("medium"),
    include_anti_ai_grid: bool = Form(False),
    image: UploadFile = FormFile(None),
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    set_setting(session, "watermark_type", type)
    set_setting(session, "watermark_text", text)
    set_setting(session, "watermark_pattern", pattern)
    set_setting(session, "watermark_rotation", str(rotation))
    set_setting(session, "watermark_opacity", str(opacity))
    set_setting(session, "watermark_tile_density", tile_density)
    set_setting(session, "watermark_include_anti_ai_grid", "true" if include_anti_ai_grid else "false")
    
    if image:
        os.makedirs("uploads/watermark_logos", exist_ok=True)
        ext = os.path.splitext(image.filename)[1].lower()
        if ext in [".png", ".jpg", ".jpeg", ".webp", ".svg"]:
            filename = f"logo_{secrets.token_hex(4)}{ext}"
            logo_path = os.path.join("uploads/watermark_logos", filename)
            
            with open(logo_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
                
            web_path = f"/api/commissions/watermark/logo?filename={filename}"
            set_setting(session, "watermark_image_path", web_path)
            set_setting(session, "watermark_image_filename", filename)
        
    return get_watermark_settings(session)

@router.get("/watermark/logo")
def get_watermark_logo(filename: str):
    # Security check to prevent directory traversal
    clean_filename = os.path.basename(filename)
    logo_path = os.path.join("uploads/watermark_logos", clean_filename)
    if not os.path.exists(logo_path):
        raise HTTPException(status_code=404, detail="Watermark logo not found")
    return SecureFileResponse(logo_path)


@router.get("/homepage_text")
def get_homepage_text(session: Session = Depends(get_session)):
    return {
        "hero_tag": get_setting(session, "homepage_hero_tag", "2D CHARACTER ATELIER"),
        "hero_title_1": get_setting(session, "homepage_hero_title_1", "Handcrafted 2D Character"),
        "hero_title_2": get_setting(session, "homepage_hero_title_2", "Illustrations & Models"),
        "hero_subtitle": get_setting(session, "homepage_hero_subtitle", "Order custom original character designs, VTuber 2D assets, and concept sheets directly from the artist. Transparent milestone delivery with watermarked WIP progress checks."),
        "badge_1": get_setting(session, "homepage_badge_1", "300 DPI Print Ready"),
        "badge_2": get_setting(session, "homepage_badge_2", "Layered PSD Assets"),
        "badge_3": get_setting(session, "homepage_badge_3", "50% Milestone Escrow"),
    }

@router.post("/homepage_text")
def update_homepage_text(
    data: dict,
    session: Session = Depends(get_session),
    admin_user: User = Depends(get_admin_user)
):
    if "hero_tag" in data: set_setting(session, "homepage_hero_tag", data["hero_tag"])
    if "hero_title_1" in data: set_setting(session, "homepage_hero_title_1", data["hero_title_1"])
    if "hero_title_2" in data: set_setting(session, "homepage_hero_title_2", data["hero_title_2"])
    if "hero_subtitle" in data: set_setting(session, "homepage_hero_subtitle", data["hero_subtitle"])
    if "badge_1" in data: set_setting(session, "homepage_badge_1", data["badge_1"])
    if "badge_2" in data: set_setting(session, "homepage_badge_2", data["badge_2"])
    if "badge_3" in data: set_setting(session, "homepage_badge_3", data["badge_3"])
    return get_homepage_text(session)


