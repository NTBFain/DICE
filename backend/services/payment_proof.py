from pathlib import Path
from fastapi import HTTPException, UploadFile
from core.security_file import validate_and_save_upload
from pypdf import PdfReader
from pypdf.errors import PyPdfError


def save_payment_proof(upload: UploadFile, path: str):
    """Restrict proofs to the announced format, rather than generic deliverables."""
    ext = Path(upload.filename or '').suffix.lower()
    header = upload.file.read(16)
    upload.file.seek(0)
    valid = ((ext in {'.jpg','.jpeg'} and header.startswith(b'\xff\xd8\xff')) or
             (ext == '.png' and header.startswith(b'\x89PNG\r\n\x1a\n')) or
             (ext == '.webp' and header[:4] == b'RIFF' and header[8:12] == b'WEBP') or
             (ext == '.pdf' and header.startswith(b'%PDF-')))
    if not valid:
        raise HTTPException(400, 'Payment proof contents must match JPG, PNG, WebP or PDF format')
    validate_and_save_upload(upload, path, max_size=15*1024*1024, is_deliverable=ext=='.pdf')
    if ext == '.pdf':
        try:
            with open(path, 'rb') as file:
                reader = PdfReader(file, strict=True)
                if reader.is_encrypted:
                    raise ValueError('Password-protected PDF proofs cannot be reviewed')
                if reader.trailer['/Root'].get('/Type') != '/Catalog' or not 1 <= len(reader.pages) <= 100:
                    raise ValueError('PDF proof must contain between 1 and 100 readable pages')
                # Resolve page dictionaries now, not when the reviewer opens the file.
                for page in reader.pages:
                    if page.get('/Type') != '/Page' or '/MediaBox' not in page:
                        raise ValueError('Invalid PDF page structure')
        except (PyPdfError, ValueError, KeyError, TypeError, OSError, RecursionError, IndexError, OverflowError) as error:
            Path(path).unlink(missing_ok=True)
            raise HTTPException(400, 'PDF proof must be a readable, unencrypted document with 1–100 pages') from error
