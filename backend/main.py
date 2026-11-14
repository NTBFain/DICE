import os
import math
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlmodel import select

from core.db import init_db, get_session
from core.config import settings
from services.demo_service import seed_demo_accounts
from core.auth import get_password_hash, decode_access_token
from models import User, ArtistProfile
from api.routers import api_router
from core.websocket import manager

app = FastAPI(
    title="DICE API",
    description="Backend API for Freelance Illustrator Platform",
    version="1.0.0"
)



def sanitize_validation_payload(obj):
    """Sanitize data structures containing float NaN/Inf or Exception objects so JSONResponse can safely serialize."""
    if isinstance(obj, float):
        if not math.isfinite(obj):
            return str(obj)
        return obj
    elif isinstance(obj, Exception):
        return str(obj)
    elif isinstance(obj, dict):
        return {k: sanitize_validation_payload(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [sanitize_validation_payload(item) for item in obj]
    elif not isinstance(obj, (int, str, bool, type(None))):
        return str(obj)
    return obj

@app.exception_handler(RequestValidationError)
async def custom_request_validation_exception_handler(request: Request, exc: RequestValidationError):
    sanitized_errors = sanitize_validation_payload(exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": sanitized_errors}
    )

# 1. Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# 2. CORS Middleware with configured origins
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    os.makedirs("uploads/slips", exist_ok=True)
    os.makedirs("uploads/originals", exist_ok=True)
    os.makedirs("uploads/watermarked", exist_ok=True)
    os.makedirs("uploads/portfolio", exist_ok=True)
    os.makedirs("uploads/characters", exist_ok=True)
    os.makedirs("uploads/auctions", exist_ok=True)
    os.makedirs("uploads/watermark_logos", exist_ok=True)
    os.makedirs("uploads/references", exist_ok=True)
    
    if settings.DEMO_MODE:
        with next(get_session()) as session:
            seed_demo_accounts(session)

@app.get("/api/demo")
def demo_configuration():
    return {"enabled": settings.DEMO_MODE}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4003)
        return
        
    email = payload.get("sub")
    if not email:
        await websocket.close(code=4003)
        return
        
    from core.db import engine
    from sqlmodel import Session
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            await websocket.close(code=4003)
            return
        user_id = user.id
        
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(user_id, websocket)
    except Exception:
        await manager.disconnect(user_id, websocket)

@app.get("/")
def read_root():
    return {"message": "Welcome to DICE API"}

app.include_router(api_router)
