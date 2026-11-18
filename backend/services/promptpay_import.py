"""Shared local-only recipient QR decoding; no image or settings are saved."""
import io
import warnings
from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
import zxingcpp
from services.promptpay import mobile_from_payload


def decode_recipient_qr(qr: UploadFile):
    content = qr.file.read(5*1024*1024+1)
    if len(content) > 5*1024*1024:
        raise HTTPException(413, 'QR image must be at most 5MB')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as image:
                if image.format not in {'PNG','JPEG','WEBP'} or image.width*image.height > 10_000_000:
                    raise ValueError('Use a PNG, JPG or WebP image up to 10 megapixels')
                image.load()
                results = zxingcpp.read_barcodes(image.convert('RGB'), formats=zxingcpp.BarcodeFormat.QRCode)
                if len(results) != 1:
                    raise ValueError('Upload an image containing exactly one readable PromptPay QR')
                mobile = mobile_from_payload(results[0].text)
        return {'mobile_number': mobile, 'saved': False}
    except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombWarning, Image.DecompressionBombError) as exc:
        raise HTTPException(422, str(exc)) from exc
