# DICE UI functionality audit

Reviewed checkout: `016c492`. Audit date: 12 November 2026 (Asia/Bangkok).

## Scope and confidence

DICE has three user-facing roles: client/user, artist, and administrator. The implementation uses `is_artist` and `is_admin` flags rather than a single exclusive role enum. Some artist pages deliberately reuse admin page components; their permissions still depend on the backend endpoint.

This audit found **19 defects or missing workflow connections**, listed below. Most controls have handlers. The recurring problem is that the handler, backend contract, rendered data, or recovery path does not complete the action advertised to the user.

Evidence labels:

- **Isolated reproduction:** executed original Python function bodies or response schemas with controlled inputs, using fake sessions where necessary. Decorators, dependency defaults, and annotations were removed for function extraction; business logic was retained. This verifies a specific failure, not the full HTTP/UI stack.
- **Source confirmed:** traced the rendered control through its handler, request, response, or consuming component. Browser appearance and timing remain unverified.

Full application startup, frontend build/lint, existing backend integration tests, and browser walkthroughs were **not completed**. `npm ci` failed to fetch packages with `EACCES`; `uv sync --frozen` failed to download wheels with Windows socket error `10013`. The project virtual environment lacks FastAPI and SQLModel. Available system Python has FastAPI and Pydantic, enabling the isolated checks without installing or connecting to the project database. No application source was fixed and no application database was opened.

## Findings at a glance

| ID | Priority | Affected roles | Control or workflow | Failure | Evidence |
|---|---|---|---|---|---|
| UI-01 | High | Artist, admin | Update Stage | Missing valid stages and invalid submitted values block normal progression | Isolated reproduction + source |
| UI-02 | High | Guest | Public commission catalog | Requires authentication; failure can redirect the visitor to login | Isolated auth check + source |
| UI-03 | High | All visitors | Artist portfolio, auction, OC tabs | API never returns the arrays consumed by these tabs | Schema reproduction + source |
| UI-04 | High | Client, artist | Background tier selection | Displayed surcharge is omitted from server total | Isolated reproduction |
| UI-05 | High | Client, artist, admin | Accepted request references | Order download looks in the wrong storage directory | Isolated reproduction + source |
| UI-06 | High | Artist, admin | Manual Ticket | Client field is ignored; creator becomes client; artist ID can resolve to another account | Isolated reproduction + source |
| UI-07 | High | Client, artist, admin | Revisions | Backend actions exist but client submission and artist resolution controls are absent | Source confirmed |
| UI-08 | Medium | Artist | Save watermark settings | Artist is shown an editor whose save endpoint requires admin | Isolated permission check + source |
| UI-09 | Medium | Admin | Save & Publish homepage | Public homepage does not consume the saved content | Source confirmed |
| UI-10 | High | Client | Upload Slip after failure | Upload remains disabled/spinning after a rejected request | Source confirmed |
| UI-11 | High | Client, artist, admin | Payment review/correction | No reviewer slip viewer; client cannot replace a submitted slip in the UI | Source confirmed |
| UI-12 | Medium | Client | Proceed with Order Request | Only opens dashboard; selected artist/options/price are lost | Source confirmed |
| UI-13 | Medium | Theme-switcher users | Grid / Masonry / Compact | Selection is stored but no showcase layout consumes it | Source confirmed |
| UI-14 | Medium | Client | Slot alert bell after revisit | Subscription state resets visually; clicking may unsubscribe unexpectedly | Source confirmed |
| UI-15 | Medium | Artist | Public-page owner controls | Name matching and mixed IDs incorrectly expose another artist's controls | Executed frontend expression + source |
| UI-16 | Medium | Client | Write a review | Review display and backend submission exist; no submission UI/API call exists | Source confirmed |
| UI-17 | Medium | All visitors | Artist queue | Individual artist page displays the platform-wide queue | Source confirmed |
| UI-18 | Medium | API consumers | Portfolio work-type filter | Non-ALL `work_type` raises an unhandled `NameError` | Isolated reproduction |
| UI-19 | High | Client, artist | Live order/invoice/file updates | Frontend waits for events the order backend never sends | Source confirmed |

Priorities describe user impact, not security severity. UI-18 is an API defect; the current public gallery filters already-fetched items locally, so this audit does not claim its category button directly triggers that API exception.

## Detailed findings

### UI-01 — Update Stage blocks the artist's normal workflow

**Locations:** `frontend/src/app/[locale]/dashboard/admin/orders/page.tsx:100` and `:290`; reused by `dashboard/artist/orders/page.tsx:1`. Backend: `backend/models/base.py:9`, `backend/api/routers/orders.py:31` and `:148`.

The dropdown submits `SKETCH`, `LINEART`, and `FINAL_REVIEW`, which are not backend states. It omits `ACCEPTED` and `SKETCHING`. Artists must follow `PENDING → ACCEPTED → SKETCHING → COLORING → COMPLETED`; selecting `COLORING` from either of the first two stages is also rejected. Administrators bypass transition ordering but still cannot submit the invalid enum strings.

**Reproduce:** open an order as its artist and try progressing it using Update Stage. Isolated calls returned HTTP 400 for all three invalid strings and for the attempted jump to `COLORING`. The mutation has no visible error reporting, so the apparent symptom is that the stage does not change.

**Repair:** share valid states with the backend, render allowed next transitions, and display failed mutation responses. Treat final review/lineart as new backend states only if the workflow is intentionally extended.

### UI-02 — Public services require login and can disappear behind a redirect

**Locations:** `backend/api/routers/artists.py:517`, `backend/core/auth.py:112`, `frontend/src/components/commission/ArtistCommissionSection.tsx:63` and `:131`, `frontend/src/lib/api.ts:28`.

The commission-info endpoint is described as public but depends on `get_current_user`, not the optional-user dependency. A guest receives 401. The API interceptor clears the token and navigates to `/login`; the commission section's own error branch also returns `null` instead of a useful error panel.

**Reproduce:** visit an artist profile in a signed-out session. The public service catalog request requires authentication. The isolated auth function raised 401 for an absent token; the browser redirect is established from source, not observed live.

**Repair:** allow anonymous catalog reads, authorize only owner-only actions, and avoid treating expected guest access as an expired session.

### UI-03 — Three artist tabs are permanently empty with real API data

**Locations:** `frontend/src/app/[locale]/artists/[handle]/page.tsx:329`, `:358`, `:404`; `frontend/src/lib/marketplaceApi.ts:332`; `backend/api/routers/artists.py:41` and `:351`; `backend/schemas/artist.py:29`.

Portfolio, Auctions, and Characters read `artist.artworks`, `artist.auctions`, and `artist.characters`. The profile builder and response schema supply none of those arrays, and the page makes no separate fetch for those tabs. Counts are not a replacement for the missing collections.

**Reproduce:** publish an artwork, auction, or character, then open the corresponding tab on the artist profile. The tab follows its empty-state branch. Even providing those arrays as extra inputs to the current Pydantic profile schema dropped all three from serialized output.

**Repair:** add appropriately filtered public collections to the response or fetch each collection when its tab opens. Keep frontend types consistent with the actual response.

### UI-04 — Background selection charges a different total than displayed

**Locations:** `frontend/src/components/commission/ModularFormBuilderModal.tsx:87`, `CommissionIntakeModal.tsx:95`, `:129`, `:199`; `backend/services/commission_service.py:95`.

The builder and intake use `config.tiers`; server pricing reads `config.options`. A selected background's price therefore never enters the server calculation for the schema produced by this UI.

**Reproduce:** base price ฿1,000, Full Scenic tier ฿1,200. The interface's intended estimate is ฿2,200; executing the server function with that schema and response produced **฿1,000**. Accepted orders/invoices use the server total.

**Repair:** standardize the schema key and calculate a server quote before final submission. Preserve the server's validation of configured prices.

### UI-05 — Reference download breaks after request acceptance

**Locations:** `backend/api/routers/commissions.py:32` and `:140`; `backend/services/commission_service.py:224`; `backend/api/routers/orders.py:705`.

Intake stores images in `uploads/references`. Acceptance creates order-file records using the reference filename but does not move/copy the actual file. Order downloads search `uploads/originals` and `uploads/watermarked`.

**Reproduce:** submit a request with a reference, accept it, and download that reference from the order workspace. An isolated download call returned 404 with the reference present in the expected intake directory. The original request reference endpoint is separate and does not correct the order-file link.

**Repair:** copy/move the reference during conversion or store an explicit storage location understood by the order download/delete handlers. Retain usable original filenames/extensions.

### UI-06 — Manual Ticket does not create the client assignment shown by its form

**Locations:** `frontend/src/app/[locale]/dashboard/admin/orders/page.tsx:153` and `:533`; `backend/schemas/order.py:5`; `backend/api/routers/orders.py:48`.

The modal collects Client Name, but the mutation forwards only title, description, and `artist_id: user.id`. The backend always sets `client_id` to the caller. Its artist lookup first interprets that user ID as an artist-profile ID, so a collision can route the ticket to another artist. An empty description is also allowed by the form but rejected by the backend schema; the mutation does not display the error.

**Reproduce:** enter Alice as client while logged in as an artist. That name is not transmitted. The isolated schema ignored `client_name`, and an isolated creation call with actor user 2 and an existing profile 2 owned by user 20 produced client 2 / artist 20.

**Repair:** use a dedicated authorized manual-order contract with explicit client and artist user IDs, an account selector, and useful validation/error feedback. Do not guess the namespace of an integer ID.

### UI-07 — Revisions have backend support but no usable frontend workflow

**Locations:** `frontend/src/app/[locale]/dashboard/client/page.tsx:34`, `:81`, `:94`; `dashboard/admin/orders/page.tsx:83`, `:124`; `backend/api/routers/orders.py:426` and `:489`.

The client defines feedback state and a revision mutation, but neither is connected to a rendered input/submit control. The artist/admin page fetches revisions and defines a resolve mutation, but does not render the revision list or a resolve action. There is no other revision submission/resolution view in the frontend.

**Reproduce:** open a sketching/coloring order as client, then as its artist. There is no way to submit feedback through the revision endpoint or mark a revision addressed through the workspace. Chat messages do not invoke the quota-tracked revision workflow.

**Repair:** render revision history, quota, eligible-stage request form, and artist resolution controls with clear errors.

### UI-08 — Artist watermark save is guaranteed to fail authorization

**Locations:** `frontend/src/app/[locale]/dashboard/artist/watermark/page.tsx:1`; `dashboard/admin/WatermarkPanel.tsx:127`; `backend/api/routers/system.py:56`.

The artist route exposes the admin watermark editor. Reading settings succeeds, but its save POST depends on `get_admin_user`. An ordinary artist receives 403; the isolated permission function confirmed that result. The displayed editor therefore offers controls the artist cannot persist.

**Repair:** either support artist-owned watermark settings end to end or show these settings as admin-controlled/read-only for artists. Changing the permission alone would expose a global setting to every artist.

### UI-09 — Save & Publish cannot change the public homepage

**Locations:** `frontend/src/app/[locale]/dashboard/admin/homepage/page.tsx:44`, `:84`; `frontend/src/app/[locale]/page.tsx:20` and `:75`; `backend/api/routers/system.py:105`.

The editor saves homepage copy and reports success. The live homepage reads translation messages and marketplace artists; it never reads the homepage-text endpoint. The editor's preview is consequently disconnected from the published page.

**Reproduce:** change the headline, click Save & Publish, then revisit the homepage. The public headline still comes from the translation bundle.

**Repair:** bind the current public homepage to this settings contract, including locale handling, or replace the obsolete editor with controls for the current homepage.

### UI-10 — Failed slip uploads disable retry indefinitely

**Locations:** `frontend/src/app/[locale]/dashboard/client/page.tsx:102`, `:131`, `:465`.

The upload handler sets `uploadingSlipId`. Only `onSuccess` clears it. There is no `onError`/`onSettled` cleanup or error message. The file input remains disabled while that ID matches.

**Reproduce:** upload an invalid/oversized image, or interrupt the request. Once the API rejects the upload, the invoice keeps its loading indicator and disabled input until the page reloads.

**Repair:** reset pending state on settlement, show the rejection reason, and reset the input so selecting the same corrected file can retry.

### UI-11 — Payment verification and correction lack essential controls

**Locations:** `frontend/src/app/[locale]/dashboard/admin/orders/page.tsx:477`; `dashboard/client/page.tsx:453`; `backend/api/routers/orders.py:367` and `:390`.

Artist/admin invoice cards show paid/unpaid and Approve Payment, but never render a slip link or authenticated preview. The backend has an authorized slip-view endpoint that the frontend does not use. The client replaces Upload Slip with a noninteractive “Slip Under Review” label after any successful submission, so a mistaken slip cannot be replaced through the UI, even though the backend pay endpoint can replace it before approval. There is no rejection/request-correction action. The approval endpoint also does not require an uploaded slip; the UI's unconditional unpaid-invoice button makes blind approval possible.

**Reproduce:** upload a slip as client and inspect the invoice as artist. There is no review control. Return to the client and try replacing the wrong slip: the upload control has disappeared.

**Repair:** add a protected slip viewer, explicit review state, and correction/resubmission controls. If manual payment confirmation without a slip is intended, distinguish that action clearly.

### UI-12 — Calculator's order CTA only navigates away

**Locations:** `frontend/src/components/PriceCalculator.tsx:8` and `:164`; `frontend/src/app/[locale]/artists/[handle]/page.tsx:322`.

Proceed with Order Request is just a dashboard link. It neither creates a request nor opens intake. The calculator receives no artist/service prop, and does not pass selected scope, usage, background, express delivery, or total to the destination. Its prices and terms are hardcoded rather than artist-specific.

**Reproduce:** choose options on an artist's page and click the CTA. The dashboard opens without those choices or an order request form.

**Repair:** connect the estimator to a selected artist service and its intake, or clearly identify it as a standalone example and link to the actual service selector.

### UI-13 — Layout mode buttons have no layout effect

**Locations:** `frontend/src/components/ThemeSwitcher.tsx:140`; `ThemeContext.tsx:348`; `frontend/src/app/[locale]/portfolio/page.tsx:216`.

Grid, Masonry, and Compact update React state/local storage and the selected checkmark. No gallery/page consumes `layoutMode`, and the setter applies no layout class or attribute. The public gallery's column layout is fixed in its component.

**Reproduce:** change showcase mode in the theme switcher. The selected mode changes in the picker but the showcase remains the same.

**Repair:** use the selected mode in the showcase renderer or remove unsupported choices. The two inert sample buttons in Theme Studio were excluded from this audit because they are visual previews.

### UI-14 — Slot subscription bell misrepresents saved state

**Locations:** `frontend/src/components/commission/SlotAlertBell.tsx:16`; `ArtistCommissionSection.tsx:415`; `frontend/src/lib/commissionApi.ts:124`.

The bell defaults to unsubscribed. Its caller never supplies saved subscription state, and `checkSlotSubscriptionStatus` is never used. Revisiting the page therefore shows “notify me” even for an active subscription. The POST toggles rather than explicitly subscribing; clicking the apparently inactive bell can turn the existing subscription off. Errors are logged only to the console.

**Reproduce:** subscribe to a closed service, leave/reload, then click the reset-looking bell. The backend toggles the active subscription off.

**Repair:** fetch subscription state keyed by user/artist/service, synchronize the control, and display failures. Prefer explicit subscribe/unsubscribe semantics if feasible.

### UI-15 — Unrelated artists can see owner-only controls

**Locations:** `frontend/src/components/commission/ArtistCommissionSection.tsx:137`; backend ownership checks in `backend/api/routers/artists.py:695` and `:716`.

The owner condition accepts an artist whose full name contains `akira`, or whose user ID happens to equal the viewed profile ID. These conditions are independent of the correct `artist_user_id` match. Executing the original frontend expression returned `true` for both an unrelated Akira-named artist and an unrelated artist with a user/profile ID collision.

**Reproduce:** use either account pattern and open somebody else's commission page. Edit Scale/Form Builder and the owner management bar appear. Backend ownership checks still reject editing that other artist's service. Add Scale uses `/me/services`, which can instead create the service under the caller's own shop.

**Repair:** compare only the authenticated user ID to `artist_user_id`; model any admin capability separately. This finding concerns misleading UI, not a demonstrated bypass of server ownership checks.

### UI-16 — Clients cannot write reviews through the website

**Locations:** `frontend/src/app/[locale]/artists/[handle]/page.tsx:434`; `backend/api/routers/artists.py:461`.

The Reviews tab displays existing reviews. The backend accepts reviews from clients with a completed order. The frontend contains no review form, submission action, or call to the `/reviews` endpoint, including in the completed-order dashboard.

**Reproduce:** complete an order and visit that artist's Reviews tab as the client. There is no submission control.

**Repair:** expose the verified-client review action from completed orders or the artist page, with eligibility and submission feedback.

### UI-17 — Artist queue displays other artists' work

**Locations:** `frontend/src/app/[locale]/artists/[handle]/page.tsx:323`; `frontend/src/components/QueueRoadmap.tsx:8`; `backend/api/routers/orders.py:83`.

Every artist page renders the same QueueRoadmap without artist context. It calls the platform-wide public queue, which has no artist filter. The profile response already contains an artist-specific `public_queue`, but this component does not consume it.

**Reproduce:** give artist A and artist B active jobs, then open either profile. Both use the same global queue, despite the “Live Artist Queue” placement. Availability inferred from that display can be wrong for the viewed artist.

**Repair:** supply artist identity to the queue request or render the profile's scoped queue.

### UI-18 — Portfolio API's work-type filter raises an exception

**Location:** `backend/api/routers/portfolio.py:11` and `:32`.

The route calls `WorkType(...)` without importing it. Its exception handler catches only `ValueError`, not `NameError`.

**Reproduce:** call `GET /api/portfolio?work_type=ILLUSTRATION`. Executing the original function with a controlled query stub raised `NameError: name 'WorkType' is not defined`. In the normal HTTP stack this is an unhandled server error. The current gallery category control filters locally, so this is a broken backend capability, not a claimed browser reproduction.

**Repair:** import the enum and define clear handling for invalid filter values.

### UI-19 — Successful changes do not refresh the other participant's workspace

**Locations:** `frontend/src/components/WebSocketContext.tsx:84`; `backend/services/notification_service.py:30`; `backend/api/routers/orders.py:187`, `:351`, `:409`, `:681`; `frontend/src/components/Providers.tsx:15`; client queries in `dashboard/client/page.tsx:61`, `:75`, `:87`.

The frontend invalidates order/invoice/revision queries for `order_status_updated`, `invoice_updated`, and `revision_updated` events. The order backend does not emit these event types. It sends generic `notification` events, for which the frontend invalidates only notifications. File uploads likewise send only a notification. These workspace queries do not poll, and refetch-on-window-focus is disabled. A local mutation invalidates only the acting browser's cache.

**Reproduce:** keep the client order workspace open while the artist changes a stage, approves payment, or uploads a file. A notification can arrive while the relevant data remains stale until a remount/manual reload/refetch. Conversely, an artist's open invoice list can miss a newly uploaded client slip. Thirty-second `staleTime` does not itself schedule a refetch.

**Repair:** emit typed domain events with order IDs, or invalidate the appropriate queries on order-related notifications; include file queries. Add reconnect reconciliation so missed events do not leave stale state.

## Additional runtime risks requiring browser/deployment verification

These are not included in the 19 findings above because their exact observed behavior depends on session/deployment conditions.

1. **Account-switch cache leakage:** `AuthContext.tsx:34` clears identity/token but never clears/cancels QueryClient data; `Providers.tsx:10` retains the same client. Private keys such as `['client-orders']`, `['client-collection']`, and `['notifications']` are not user-scoped. Switching accounts without a full document reload can display the previous account's cached data, at least transiently. Verify with two accounts in the same browser and clear/scope private caches at identity changes.
2. **Production live delivery across workers:** `run_prod.bat:21` launches two backend workers, while `backend/core/websocket.py:8` keeps connections only in each process's memory. Messages emitted by another worker cannot find those sockets without a shared relay. Polling partly masks this for auctions/notifications but not order chat. Verify with two sessions and the production worker count; introduce cross-worker messaging if retaining multiple workers.

## Verification record and next execution order

Run `python scripts/audit_ui_function_probes.py` using Python with FastAPI and Pydantic installed. The script reproduces stage rejections, omitted dropdown stages, background underpricing, omitted profile arrays, manual-ticket identity errors, portfolio filtering failure, auth/permission guards, and reference-file 404. It uses original extracted functions and fake sessions; it does not start the app or prove browser behavior. Temporary file evidence is created in the system temporary directory and removed automatically.

The frontend owner condition was separately executed with Node directly from its source expression; unrelated Akira-name and ID-collision accounts both evaluated as owners.

Once dependency access is available, prioritize complete browser flows in this order:

1. Guest browsing → artist catalog → login → submit a configured commission with references and paid background → artist acceptance.
2. Correct client/artist identity → order-stage progression → invoices → failed upload recovery → slip review/correction → payment approval → final delivery.
3. Revision request/resolution, verified review submission, and notifications/live updates with both participants' pages open.
4. Manual tickets, artist watermark permissions, profile content tabs, scoped queues, and subscription persistence.
5. Homepage publishing, layout controls, account switching, Thai/English rendering, and production multi-worker live delivery.

Fix UI-01, UI-04, UI-05, UI-06, UI-10, UI-11, and UI-19 first because they affect fulfillment, pricing, payment, file access, or the apparent success of another participant's action. Re-run the existing project tests and full browser workflows after fixes; the isolated probes are failure demonstrations and must be revised or replaced with normal regression tests as the implementations change.
