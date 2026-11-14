# Short DICE demonstration script

## Before the presentation

Follow DEMONSTRATION_SETUP.md. Explicitly enable demo mode and use the generated local secret. Use the clean demo database, not the isolated review database containing intentional failure records. Open /en in the built-in Chromium browser. Demo buttons fill admin/artist/client accounts; press Sign In. Use the local sample-reference.png and sample-deliverable.pdf in test-suite/fixtures. All payments below are sample slips with no real transfer.

Prepare once as Artist: verify the studio profile, upload a local gallery sample, create a simple500-baht service with at least2 slots, set50% deposit and a short terms statement, and enable it. Optionally enable a required custom question and background add-on. Publish one short auction with a future end time and an auto-buy amount. These preparation actions use the normal UI.

## Commission: about6 minutes

1. Client: search for Main Artist, inspect portfolio/character/reviews, open the service, complete the brief and choose a future Bangkok calendar date. Attach the local image, accept the demo artist’s terms and submit. Show the pending proposal and fresh reopened form.
2. Sign out, then Artist: open the request, inspect structured answers/terms and accept. Open the new order, show matching price and two invoices.
3. Client: upload sample deposit proof. Artist: inspect proof and approve. Move to Sketching, upload the WIP and send a chat message.
4. Client: request a revision. Artist: resolve it, advance to Coloring and upload the final PDF. Client: show that an unpaid original PDF is restricted, then submit sample final proof.
5. Artist: inspect the proof, approve final payment and complete. Client: download the original, open My Collection and submit a verified review on the artist page if this client has not already reviewed that artist.

Use sequential sign-out/sign-in in the same browser. Tabs share one session. Refresh is a valid backup during a live presentation; it is not used to claim live-update verification.

## Auction: about2 minutes

1. Client: open the prepared auction, inspect countdown and minimum increment, then bid or use auto-buy. Confirm ended/winner state and the order/payment link.
2. Use the same sample-proof approval/delivery process, then show the won artwork/order in My Collection. To demonstrate outbid with one browser, sign in as a second disposable client and bid, then return to the first client.

## Administrator: about2 minutes

1. Show account search and role controls using a disposable account; cancel deletion to demonstrate the confirmation dialog. Avoid deleting presentation accounts or history.
2. Show global queues and paid financial totals. Compare Artist’s own earnings with Admin’s global figures.
3. Open catalogue moderation, all eight work categories, homepage preview, Theme Studio and watermark controls. Change preview fields and cancel/reload if no saved change is intended.
4. Switch English/Thai and briefly narrow to a mobile viewport. Show readable brief fields, keyboard Escape/focus behavior and collection actions.

If an unexpected defect appears, retain the input/screenshot and report it. The readiness report states the verified scope and excluded browser/load/permutation limits; do not describe testing as proof that no undiscovered bugs exist.
