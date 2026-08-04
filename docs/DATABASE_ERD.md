# Database Entity-Relationship (ER) Diagram

This document describes the database schema for the application, built using **SQLModel / SQLAlchemy** and SQLite in High-Performance WAL Mode.

## ER Diagram (Mermaid)

Below is the visual representation of the database tables and their relationships.

```mermaid
erDiagram
    USER ||--o| ARTIST_PROFILE : "claims (user_id)"
    USER ||--o{ ORDER : "places (client_id)"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ AUCTION : "wins"
    USER ||--o{ BID : "places"
    USER ||--o{ MESSAGE : "sends"

    ARTIST_PROFILE ||--o{ ARTIST_SERVICE : "offers"
    ARTIST_PROFILE ||--o{ ARTIST_REVIEW : "receives"
    ARTIST_PROFILE ||--o{ ARTWORK : "showcases"
    ARTIST_PROFILE ||--o{ AUCTION : "hosts"

    CHARACTER ||--o{ ARTWORK : "depicts"

    ORDER ||--o{ MILESTONE_INVOICE : "contains"
    ORDER ||--o{ REVISION : "requests"
    ORDER ||--o{ FILE : "includes"
    ORDER ||--o{ MESSAGE : "contains"

    AUCTION ||--o{ BID : "receives"

    USER {
        int id PK
        string email "Unique, Index"
        string full_name
        boolean is_artist
        boolean is_admin
        string avatar_url "Optional"
        string hashed_password "Optional"
        datetime created_at
    }

    ARTIST_PROFILE {
        int id PK
        int user_id FK "Optional, Index"
        string handle PK "Unique, Index"
        string display_name
        string tagline
        text bio
        string avatar_url "Optional"
        string banner_url "Optional"
        string styles "Comma-separated"
        string commission_status "OPEN/CLOSED/WAITLIST"
        float rating
        int total_completed_orders
        float starting_price
        string social_twitter "Optional"
        boolean is_verified
        boolean is_featured
        datetime created_at
    }

    ARTIST_SERVICE {
        int id PK
        int artist_id FK "Index"
        string title
        string category
        text description
        float base_price
        int estimated_days
        boolean includes_commercial
        boolean includes_psd
        string sample_image_url "Optional"
        datetime created_at
    }

    ARTIST_REVIEW {
        int id PK
        int artist_id FK "Index"
        string client_name
        int rating
        text comment
        datetime created_at
    }

    CHARACTER {
        int id PK
        string name
        string description "Optional"
        string theme_color "Optional"
        string image_url "Optional"
        datetime created_at
    }

    ARTWORK {
        int id PK
        string title
        string description "Optional"
        string image_url
        VisibilityStatus visibility_status
        WorkType work_type
        int character_id FK "Optional"
        datetime created_at
    }

    AUCTION {
        int id PK
        string title
        string description
        string image_url "Optional"
        AuctionType auction_type "Index"
        AuctionStatus status "Index"
        float starting_bid
        float bid_increment
        float auto_buy "Optional"
        datetime start_time
        datetime end_time "Index"
        float winning_bid "Optional"
        int winner_id FK "Optional, Index"
        datetime created_at
    }
```

---

## Detailed Schema Definitions

### 1. User (`User`)
Represents registered accounts on the platform (Clients, Artists, Administrators).
* **Relationships**:
  * Optionally links to 1 `ArtistProfile` (`user_id`).
  * Places many `Order`s (`client_id`).
  * Receives many `Notification`s (`user_id`).

### 2. Artist Profile (`ArtistProfile`)
Represents individual artist studio profiles in the multi-artist marketplace.
* **Fields**:
  * `handle`: Unique URL identifier (e.g. `@kiriko_art`).
  * `display_name`: Studio name / Pen name.
  * `styles`: Multi-style tags (e.g. `VTuber 2D, Anime Full Body`).
  * `commission_status`: `OPEN`, `CLOSED`, `WAITLIST`.

### 3. Artist Service (`ArtistService`)
Represents pricing packages offered by an artist.
* **Relationships**:
  * Belongs to an `ArtistProfile` (`artist_id`).

### 4. Artist Review (`ArtistReview`)
Represents client ratings and testimonials for an artist.
* **Relationships**:
  * Belongs to an `ArtistProfile` (`artist_id`).
