# Backend API

## Setting up and Running

1. Make sure you have `uv` installed.
2. Run the server using:
   ```bash
   uv run uvicorn main:app --reload
   ```

## Default Accounts
When the database is initialized, two mock accounts are created:
- Admin: `admin@example.com` / Password: `password123`
- Client: `client@example.com` / Password: `password123`
