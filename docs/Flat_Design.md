# Design Specification: "The Gallery Grid"
For DICE Platform (Digital Illustration Commission Exchange)

## 1. Core Philosophy
This design utilizes the **"Editorial Flat"** approach, inspired by high-end art editorial publications and Swiss Design. It discards elements commonly found in generic or AI-generated UIs, such as soft drop shadows, symmetrical rounded corners, or gradients.

The goal is to create an "empty, quiet gallery" to let the artist's artwork stand out, whether in an active auction, a portfolio showcase, or a commission workspace. The system must feel intentional, mathematically ordered, and highly professional.

## 2. Color Palette
Avoid muddy grays typical of generic software. Colors must be decisive and purposeful.

### 2.1 Light Mode: "The White Cube"
Mimics a well-lit physical art gallery with pristine white walls.
*   **Background:** `#FDFDFD` (Alabaster White) - Near-perfect white to prevent color distortion of digital illustrations.
*   **Surface (Toolboxes/Secondary):** `#F4F4F4` (Gallery Light Grey) - Used to separate structural zones (like bid history or chat logs) without drawing lines.
*   **Text Primary (Headers):** `#111111` (Ink Black) - Deep black for maximum contrast.
*   **Text Secondary (Dates/Data):** `#666666` (Graphite)
*   **Borders & Grids:** `#E0E0E0` (Sharp Silver) - Crisp 1px solid borders.
*   **Accent:** `#002BDC` (Ultramarine Blue) - A vibrant blue evoking both classic and modern art. Used strictly for critical actions like "Place Bid" or "Accept Commission".

### 2.2 Dark Mode: "The Darkroom"
Mimics a photographic darkroom or a sleek digital studio, emphasizing artwork against a dark void.
*   **Background:** `#09090B` (Obsidian Dark) - Avoid pure black (`#000`) to reduce eye strain.
*   **Surface:** `#121215` (Studio Slate)
*   **Text Primary:** `#F4F4F5` (Zinc White) - Bright but comfortable to read.
*   **Text Secondary:** `#A1A1AA` (Muted Zinc)
*   **Borders & Grids:** `#27272A` (Crisp Zinc) - 1px borders that blend subtly into the dark mode.
*   **Accent:** `#E2B857` (Warm Gold) or `#3B82F6` (Studio Cobalt) - For high-end, premium transaction actions like "Auto Buy (AB)" or "Pay Invoice".

## 3. Typography
Typography acts as the primary decorative element. We use font pairing to create a smart, engaging structure.

*   **Display / Headers (Artist Names, Auction Titles):**
    *   Use **"Helvetica Now Display"** or **"Inter"** (Bold/Black weight).
    *   Oversized (e.g., 48px or 64px for Adoptable names) with slight negative tracking (Tracking: -0.02em) for a dense, impactful look.
*   **Body (Descriptions, Terms of Service, Chat):**
    *   Use **"Inter"** or **"Roboto"** (Regular/Medium weight).
    *   14px to 16px for clean readability.
*   **Meta Data (Bid Prices, Timers, Invoice IDs, Status):**
    *   Use **"Space Mono"** or **"JetBrains Mono"** (Regular weight).
    *   11px to 12px. Injecting a developer-style monospace font into financial data (e.g., `$150.00`, `02:15:30`, `[SKETCHING]`) makes the interface feel like a raw, precise financial tool.

## 4. UI Components

### 4.1 The Grid Architecture
*   **No Floating Cards:** Eliminate floating card systems. Everything must be bound by grid lines.
*   The screen is divided by 1px solid borders running full-bleed. For example, the Auction view features a 2-column or 3-column strict grid separating the Artwork, Bidding History, and Artist Details without underlying gray backgrounds.
*   Dashboards and Client/Artist Portals use thin vertical and horizontal lines to separate status sections (Pending, WIP, Completed) like a highly organized spreadsheet.

### 4.2 Art & Adoptable Cards: Visual-First
Cards act as "picture frames" for artwork.
*   **Proportions:** Focus entirely on the illustration thumbnail (flexible ratios depending on the piece, standardizing to 1:1, 4:5, or 16:9 grids).
*   **Structure:** Images sit flush to the top, left, and right edges (0px padding). The bottom retains minimal white space for the piece's name and monospace meta data (e.g., current bid or `[CLOSED]`).
*   **Corners:** Sharp 90-degree angles (0px border-radius) or extremely subtle curves (max 2px).
*   **Shadowless:** Zero drop shadows. Depth is indicated solely by solid borders (black in Light Mode, zinc in Dark Mode).

### 4.3 Buttons & Micro-interactions
*   **Buttons:** Sharp rectangular shapes, shadowless, solid color backgrounds.
*   **Hover States (Instant Crisp):** No soft fade-in/out transitions (Transition: 0s). On hover, colors should invert instantly (e.g., from white background/black text to black background/white text) to feel decisive, especially crucial in live auctions.
*   **Active States:** Use thicker solid borders (2px or 3px) to highlight focus areas or currently selected order stages.

## 5. Strict Anti-AI & Anti-Generic SaaS Rules
1.  **No Gradients:** All elements must use solid colors exclusively. (No colorful gradient text for "Premium" features).
2.  **No Drop Shadows:** To elevate an element (e.g., a Bid Modal, Upload Dropzone, or Dropdown), use thicker borders and a solid block shadow (e.g., `box-shadow: 4px 4px 0px #111`) instead of blurred shadows.
3.  **No 3D or Glassmorphism:** Use simple, monoline vector icons. Avoid blurred backgrounds (`backdrop-filter: blur`) unless strictly necessary for a sticky header overlaid on artwork.
4.  **No Unnecessary Fill Colors:** Let whitespace (or dark space) do the heavy lifting. If an Auction detail page feels too empty, increase the typography size of the current bid rather than filling the space with background boxes.