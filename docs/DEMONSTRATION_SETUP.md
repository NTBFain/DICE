# Local demonstration setup

Use Python/uv and Node/npm already installed for this project. From the repository root:

```powershell
python scripts/setup_local.py --demo
cd backend
uv sync
uv run uvicorn main:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000/en. Use the three quick credential buttons; they fill the form before Sign In. Demo accounts are admin@example.com, artist@example.com and client@example.com with password123. This is disposable local demo data. No real money is transferred; use sample slips.

Setup creates an ignored backend/.env with a random signing secret once, keeps an existing valid secret on subsequent runs, preserves existing database settings and explicitly enables DEMO_MODE. The default local database is backend/dice-local.db; uploads live beneath the backend working directory. Start the backend from that directory. An unavailable configured database fails visibly instead of silently switching databases. Existing user records are never overwritten by demo seeding. New demo profiles use bundled local SVG images; no image service is needed. Changing a previously shared signing secret expires older sessions; sign in again once.

For a separate disposable review copy, run setup_local.py --demo --backend-dir ABSOLUTE_TEMP_BACKEND_DIRECTORY and start uvicorn with that directory as the working directory plus --app-dir ABSOLUTE_REPOSITORY_BACKEND_DIRECTORY. This isolates .env, SQLite and uploads. Do not use development data as fixtures.

To disable demo helpers, run python scripts/setup_local.py --no-demo and restart the backend. This prevents future seeding and hides quick credentials. It preserves existing demo records. SECRET_KEY has no built-in fallback. Do not publish .env or share the generated signing secret.

Focused checks (from the repository root, using the project's Python environment):

```powershell
backend/.venv/Scripts/python.exe test-suite/run_checks.py --legacy
```

The runner uses temporary working directories, memory databases and a per-process secret. Tests run sequentially and do not contact an existing server. Browser walkthroughs remain separate. If frontend dependencies are installed in a preview mirror, set DICE_FRONTEND_RUNTIME to that frontend directory for the small presentation-helper check.

The review target is a single local demonstration. Public load testing, multi-worker deployment certification and Firefox/WebKit certification are outside the agreed scope.
