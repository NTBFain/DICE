# DICE focused role review

Current authority: [readiness report](READINESS_REPORT_2026-11-14.md), [role results](ROLE_CAPABILITIES.json) and [current page/control/API inventory](INVENTORY_CURRENT.json). Historical checkpoints and failure evidence remain preserved; do not add their counts to the current run.

Workflow: checklist → built-in browser confirmation → report → authorized code repair → targeted regression. Client, artist and admin are all reviewed. Primary browser actions and supporting real API/WebSocket actions are identified in the report. The original full Playwright/multi-browser suite plan was superseded by the user’s sequential, low-CPU workflow.

## Run checks

From the repository root with the project’s Python environment:

```powershell
backend/.venv/Scripts/python.exe test-suite/run_checks.py --legacy
```

The runner creates a temporary working directory, memory database and private per-process secret; runs client/shared Python checks, optional older backend checks, then small Node checks with concurrency1. It never calls an existing server. Frontend dependencies must be installed. If those dependencies live in a preview mirror, set DICE_FRONTEND_RUNTIME to its absolute frontend path.

For a targeted Python check, supply a disposable DATABASE_URL and SECRET_KEY and run only the relevant unittest module. Avoid ad-hoc older scripts against configured databases. Legacy HTTP checks now use tests/isolated_app.py with its own database and uploads.

Current final automated result:45 client Python+57 shared Python+18 legacy Python+43 Node=163 passed,0 failed. No test retries hide failures. Browser/capability counts are separate:61 verified demonstration groups; extended limitations1 blocked/3 not run. No empty passing artist/admin placeholder suites were added; supporting cross-role checks live in shared.

## Local preview and files

Use docs/DEMONSTRATION_SETUP.md and docs/DEMONSTRATION_SCRIPT.md. The reviewed preview uses frontend3000/backend8000 with a separate working directory, SQLite database and uploads; original development data is not a fixture. Existing application routes/enum values remain compatible.

- client/: client helper and behavior regressions/checklist.
- artist/ and admin/: actual role checklists and focused role helper regressions.
- shared/: auth/permissions, supporting role actions, transaction/accounting/upload and setup regressions.
- fixtures/: local disposable media; no real payments or personal files.
- reports/: generated logs/screenshots/results, excluded from Git. Original failures remain here.

No production load, multi-worker deployment, Firefox or WebKit certification is claimed. No commit/merge/push is performed by the review; the user handles publication.
