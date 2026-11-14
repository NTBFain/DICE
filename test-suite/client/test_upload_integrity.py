"""Focused upload-integrity regressions; no running app or external services."""
import io
import tempfile
import unittest
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image

from core.security_file import validate_and_save_upload


def image_bytes(format="PNG"):
    buffer = io.BytesIO()
    Image.new("RGB", (12, 10), "blue").save(buffer, format=format)
    return buffer.getvalue()


class UploadIntegrityTests(unittest.TestCase):
    def save(self, content, target, **options):
        validate_and_save_upload(UploadFile(filename="sample.png", file=io.BytesIO(content)), str(target), **options)

    def test_real_raster_formats_retain_original_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            for format in ("PNG", "JPEG", "WEBP", "GIF"):
                with self.subTest(format=format):
                    content = image_bytes(format)
                    target = Path(directory, format)
                    self.save(content, target)
                    self.assertEqual(target.read_bytes(), content)

    def test_audio_and_truncated_images_rejected_without_replacing_previous_upload(self):
        invalid = [b"RIFF\x0e\x00\x00\x00WAVEfmt \x00\x00\x00\x00", b"\x89PNG\r\n\x1a\n", b"\xff\xd8\xff", b"RIFF\x00\x00\x00\x00WEBP", image_bytes("JPEG")[:-20]]
        for deliverable in (False, True):
            for content in invalid:
                with self.subTest(deliverable=deliverable, header=content[:12]), tempfile.TemporaryDirectory() as directory:
                    target = Path(directory, "existing.png")
                    original = image_bytes()
                    target.write_bytes(original)
                    with self.assertRaises(HTTPException) as error:
                        self.save(content, target, is_deliverable=deliverable)
                    self.assertEqual(error.exception.status_code, 400)
                    self.assertEqual(target.read_bytes(), original)
                    self.assertEqual(list(Path(directory).iterdir()), [target])

    def test_size_limit_preserves_existing_upload_and_removes_staging_file(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory, "existing.png")
            target.write_bytes(b"previous proof")
            with self.assertRaises(HTTPException) as error:
                self.save(image_bytes(), target, max_size=20)
            self.assertEqual(error.exception.status_code, 413)
            self.assertEqual(target.read_bytes(), b"previous proof")
            self.assertEqual(list(Path(directory).iterdir()), [target])

    def test_pdf_deliverable_remains_supported_but_not_as_an_image(self):
        content = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF"
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory, "sample.pdf")
            self.save(content, target, is_deliverable=True)
            self.assertEqual(target.read_bytes(), content)
            with self.assertRaises(HTTPException) as error:
                self.save(content, Path(directory, "image.png"))
            self.assertEqual(error.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
