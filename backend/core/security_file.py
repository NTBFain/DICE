import os
import shutil
from fastapi import UploadFile, HTTPException

MAX_IMAGE_SIZE = 25 * 1024 * 1024        # 25 MB
MAX_DELIVERABLE_SIZE = 200 * 1024 * 1024 # 200 MB

IMAGE_MAGIC_SIGNATURES = [
    (b"\xFF\xD8\xFF", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"RIFF", "webp"),
    (b"GIF87a", "gif"),
    (b"GIF89a", "gif"),
]

DELIVERABLE_MAGIC_SIGNATURES = IMAGE_MAGIC_SIGNATURES + [
    (b"%PDF", "pdf"),
    (b"8BPS", "psd"),
    (b"PK\x03\x04", "zip"),
    (b"Rar!\x1a\x07", "rar"),
    (b"CSFCHUNK", "clip"),
]

def validate_and_save_upload(
    upload_file: UploadFile,
    destination_path: str,
    max_size: int = MAX_IMAGE_SIZE,
    is_deliverable: bool = False
):
    header = upload_file.file.read(16)
    upload_file.file.seek(0)
    
    signatures = DELIVERABLE_MAGIC_SIGNATURES if is_deliverable else IMAGE_MAGIC_SIGNATURES
    matched = any(header.startswith(sig) for sig, _ in signatures)
    
    if not matched:
        # Also allow WebP where header has RIFF....WEBP
        if len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
            matched = True
            
    if not matched:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file signature (magic bytes mismatch). Disguised or corrupted files are rejected."
        )

    os.makedirs(os.path.dirname(destination_path) or '.', exist_ok=True)
    total_bytes = 0
    with open(destination_path, "wb") as buffer:
        while chunk := upload_file.file.read(64 * 1024):
            total_bytes += len(chunk)
            if total_bytes > max_size:
                buffer.close()
                if os.path.exists(destination_path):
                    try:
                        os.remove(destination_path)
                    except OSError:
                        pass
                raise HTTPException(
                    status_code=413, 
                    detail=f"File exceeds maximum allowed size of {max_size // (1024*1024)}MB"
                )
            buffer.write(chunk)
