import os
import tempfile
import warnings

from fastapi import UploadFile, HTTPException
from PIL import Image, UnidentifiedImageError

MAX_IMAGE_SIZE = 25 * 1024 * 1024        # 25 MB
MAX_DELIVERABLE_SIZE = 200 * 1024 * 1024 # 200 MB

IMAGE_MAGIC_SIGNATURES = [
    (b"\xFF\xD8\xFF", "jpg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
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


def _verify_raster_image(path: str) -> None:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(path) as image:
                if image.format not in {"JPEG", "PNG", "WEBP", "GIF"}:
                    raise ValueError("Unsupported image format")
                image.verify()
            # Some formats only check their header in verify(); decode pixels too.
            with Image.open(path) as image:
                image.load()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError,
            Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted image. Please upload a valid PNG, JPEG, WebP or GIF file."
        ) from exc


def validate_and_save_upload(
    upload_file: UploadFile,
    destination_path: str,
    max_size: int = MAX_IMAGE_SIZE,
    is_deliverable: bool = False
):
    header = upload_file.file.read(16)
    upload_file.file.seek(0)
    is_webp = len(header) >= 12 and header[:4] == b"RIFF" and header[8:12] == b"WEBP"
    is_raster = is_webp or any(header.startswith(sig) for sig, _ in IMAGE_MAGIC_SIGNATURES)
    signatures = DELIVERABLE_MAGIC_SIGNATURES if is_deliverable else IMAGE_MAGIC_SIGNATURES
    if not (is_webp or any(header.startswith(sig) for sig, _ in signatures)):
        raise HTTPException(
            status_code=400,
            detail="Invalid file signature (magic bytes mismatch). Disguised or corrupted files are rejected."
        )

    directory = os.path.dirname(destination_path) or '.'
    os.makedirs(directory, exist_ok=True)
    staged_path = None
    try:
        # Validate a separate file so failures never replace an existing upload.
        with tempfile.NamedTemporaryFile(mode="wb", dir=directory, prefix=".upload_", delete=False) as buffer:
            staged_path = buffer.name
            total_bytes = 0
            while chunk := upload_file.file.read(64 * 1024):
                total_bytes += len(chunk)
                if total_bytes > max_size:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum allowed size of {max_size // (1024*1024)}MB"
                    )
                buffer.write(chunk)
        if is_raster:
            _verify_raster_image(staged_path)
        os.replace(staged_path, destination_path)
    finally:
        if staged_path is not None and os.path.exists(staged_path):
            os.remove(staged_path)
