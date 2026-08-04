import os
import unittest
from fastapi.testclient import TestClient
from main import app
from core.db import engine
from sqlmodel import SQLModel

class TestSecurity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        SQLModel.metadata.create_all(engine)

    def test_directory_traversal_watermark_logo(self):
        # Endpoint: /api/commissions/watermark/logo?filename=...
        # Should sanitize filename to 'config.py' and look inside uploads/watermark_logos
        # which shouldn't exist, returning 404 (instead of disclosing core/config.py).
        response = self.client.get("/api/commissions/watermark/logo?filename=../../core/config.py")
        self.assertEqual(response.status_code, 404)
        
        response2 = self.client.get("/api/commissions/watermark/logo?filename=..\\..\\core\\config.py")
        self.assertEqual(response2.status_code, 404)

    def test_directory_traversal_portfolio_image(self):
        response = self.client.get("/api/portfolio/images/../../core/config.py")
        self.assertIn(response.status_code, [404, 400])

    def test_directory_traversal_character_image(self):
        response = self.client.get("/api/characters/images/../../core/config.py")
        self.assertIn(response.status_code, [404, 400])

    def test_invalid_email_registration(self):
        payload = {
            "email": "invalidemail",
            "full_name": "Test User",
            "password": "password123"
        }
        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 422) # Pydantic validation error

    def test_short_password_registration(self):
        payload = {
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "123"
        }
        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 422) # Pydantic validation error

    def test_valid_registration_passes_validation(self):
        # We use a random email to prevent duplicate database constraints
        import secrets
        email = f"user_{secrets.token_hex(4)}@example.com"
        payload = {
            "email": email,
            "full_name": "Secure Test User",
            "password": "securepassword123"
        }
        response = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(response.status_code, 200)

if __name__ == "__main__":
    unittest.main()
