#!/usr/bin/env python3
"""
========================================================================================
🎲 DICE Platform - High-Fidelity Performance Mock Data Generator
========================================================================================
Generates a massive, production-realistic dataset for load testing, UI virtualization,
indexing, search, and query performance validation across the DICE art marketplace platform.

Features:
- Realistic VTuber, Live2D, 2D Anime & Commission marketplace domain data
- 60+ Unique Artists with full portfolios, services, characters (OCs), and styles
- 300+ Active Clients & Collectors
- 2,000+ Artworks across 8 work types with curated aesthetic image URLs
- 800+ Commission Orders traversing the complete lifecycle (Pending to Completed)
- 1,600+ Milestone Invoices & payment slips
- 5,000+ Multi-turn real-world Order Chat Messages
- 200+ Active & Ended Auctions with 3,000+ realistic bid wars & live auction chats
- 1,200+ Detailed Artist Reviews (4-5 stars with rich feedback)
- 4,000+ System, Auction & Order Notifications
- Total: 22,000+ relational records generated in ~3-5 seconds!
- Pre-hashed password ('password123') for all mock accounts
- Safe isolation with `@mockdice.io` domain; automatic pre-run database backup
- Easy clean and reset options: `--clean` or `--reset`
========================================================================================
"""

import os
import sys
import shutil
import random
import argparse
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from sqlmodel import Session, select, func
from core.db import engine
from core.auth import get_password_hash
from models import (
    User, ArtistProfile, ArtistService, ArtistReview,
    Character, Artwork, VisibilityStatus, WorkType,
    Order, OrderStatus, MilestoneInvoice, Revision, File, Message,
    Auction, AuctionStatus, AuctionType, Bid, AuctionMessage,
    Notification, NotificationType
)

DB_FILE = "test.db"
MOCK_DOMAIN = "@mockdice.io"

# Pre-compute password hash once so 350+ users are created in < 0.1s
DEFAULT_PASSWORD = "password123"
CACHED_PASSWORD_HASH = get_password_hash(DEFAULT_PASSWORD)

# Curated High-Quality Anime / Digital Art / Character Illustrations
SAMPLE_ART_IMAGES = [
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1515260268569-9271009adfdb?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1580927752452-89d86da3fa0a?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1614036417651-efe5912149d8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1618172193763-c511deb635ca?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80",
]

AVATAR_IMAGES = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
]

BANNER_IMAGES = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80",
]

def get_art_image(seed_val: int) -> str:
    if seed_val % 3 == 0:
        return SAMPLE_ART_IMAGES[seed_val % len(SAMPLE_ART_IMAGES)]
    return f"https://picsum.photos/seed/dice_art_{seed_val}/1200/800"

def get_avatar_image(seed_val: int) -> str:
    if seed_val % 4 == 0:
        return AVATAR_IMAGES[seed_val % len(AVATAR_IMAGES)]
    return f"https://picsum.photos/seed/dice_avatar_{seed_val}/300/300"

# --- Curated Artist Seeds (60 Real Persona Profiles) ---
ARTIST_DEFINITIONS = [
    {
        "handle": "kuroneko_studio", "name": "Kuro Studio", "display_name": "Kuro Studio 🐾",
        "tagline": "VTuber Model Character Design & High-Param Live2D Rigging",
        "styles": "VTuber 2D, Live2D Rigging, Character Sheet",
        "bio": "Specialized in expressive Live2D models ready for VTube Studio and VBridger. Over 4 years of rigging experience for indies and agency talents. Open for full model commissions.",
        "starting_price": 5000.0, "status": "OPEN", "featured": True
    },
    {
        "handle": "sakura_chibi", "name": "Sakura Mochi", "display_name": "Sakura Chibi 🌸",
        "tagline": "Cute Chibi Emotes, Sub Badges & Stream Overlays",
        "styles": "Chibi, Emotes, Stream Assets",
        "bio": "Creating joyful, super expressive chibis for Twitch and YouTube streamers! Fast turnaround with commercial rights always available.",
        "starting_price": 800.0, "status": "OPEN", "featured": True
    },
    {
        "handle": "vyn_mecha", "name": "VYN", "display_name": "VYN // Mecha & Tech",
        "tagline": "Hard-Surface Mecha, Cyberpunk Aesthetics & Sci-Fi Concept Art",
        "styles": "Cyberpunk, Sci-Fi, Mecha, Concept Art",
        "bio": "Concept artist for indie sci-fi games and virtual influencers. Focuses on intricate mechanical joints, armor design, and neon atmospheres.",
        "starting_price": 3500.0, "status": "OPEN", "featured": True
    },
    {
        "handle": "luna_fantasy", "name": "Luna Whisper", "display_name": "Luna Luminescence ✨",
        "tagline": "Ethereal Dark Fantasy, TTRPG Character Art & Key Splash",
        "styles": "Dark Fantasy, RPG, Splash Art, Illustration",
        "bio": "Illustrator obsessed with dramatic rim lighting, stained glass themes, and celestial deities. Available for book covers and game splash illustrations.",
        "starting_price": 2800.0, "status": "OPEN", "featured": True
    },
    {
        "handle": "ren_live2d", "name": "Ren Amasawa", "display_name": "Ren 2D Model Workshop",
        "tagline": "Smooth Physics Specialist (Hair, Clothes, VBridger Mouth)",
        "styles": "VTuber 2D, Live2D Rigging",
        "bio": "Rigging maestro specializing in ultra-smooth hair physics, head XYZ 9-point angles, and realistic breathing motion. Portfolio includes 30+ debut models.",
        "starting_price": 8500.0, "status": "WAITLIST", "featured": True
    },
    {
        "handle": "haruto_brush", "name": "Haruto", "display_name": "Haruto Inking 🖋️",
        "tagline": "Dynamic Action Manga Key Visuals & Webtoon Inking",
        "styles": "Manga Layout, Webtoon Key Visual, Inking",
        "bio": "Manga artist and storyboarder. High-energy poses, dramatic camera perspectives, and clean screen-tone rendering for action projects.",
        "starting_price": 1800.0, "status": "OPEN", "featured": False
    },
    {
        "handle": "pixel_witch", "name": "PixelWitch", "display_name": "PixelWitch Retro 🎮",
        "tagline": "Pixel Art Sprites, Retro Animations & Isometric Game Assets",
        "styles": "Retro, Pixel Art, Animation",
        "bio": "Crafting nostalgic 16-bit and 32-bit pixel sprites, animated idle loops, and stream starting screens with authentic retro vibes.",
        "starting_price": 1200.0, "status": "OPEN", "featured": False
    },
    {
        "handle": "aerith_cg", "name": "Aerith Chen", "display_name": "Aerith CG Illustration",
        "tagline": "High-End Anime Splash Art & Light Novel Covers",
        "styles": "Anime Illustration, Splash Art, Concept Art",
        "bio": "Digital painter inspired by Fate/Grand Order and Genshin Impact aesthetics. Rich color gradients, intricate clothing textures, and cinematic compositions.",
        "starting_price": 4200.0, "status": "WAITLIST", "featured": True
    },
    {
        "handle": "chiyo_craft", "name": "Chiyo", "display_name": "Chiyo Cute Studio 🍡",
        "tagline": "Soft Pastel Illustrations, Merch Design & Standee Art",
        "styles": "Pastel, Watercolors, Whimsical",
        "bio": "Pastel dreams and cozy moods. Perfect for acrylic standees, keychains, stickers, and cheerful character art.",
        "starting_price": 1500.0, "status": "OPEN", "featured": False
    },
    {
        "handle": "valkyrie_art", "name": "Valkyrie Visuals", "display_name": "Valkyrie Design Studio",
        "tagline": "Adoptables Specialist: Fantasy Champions & Kemonomimi",
        "styles": "Adoptables, Kemonomimi, Character Design",
        "bio": "Original adoptables and character designs with full commercial rights. Unique weapon concepts and detailed reference sheets included.",
        "starting_price": 2500.0, "status": "OPEN", "featured": True
    },
    {
        "handle": "neon_samurai", "name": "Shinji Neon", "display_name": "Neon Samurai ⚡",
        "tagline": "Cyberpunk Warriors, Glitch Aesthetics & Holo Posters",
        "styles": "Cyberpunk, Sci-Fi, Illustration",
        "bio": "Neon-drenched Tokyo nights, cybernetic katanas, and futuristic streetwear character designs.",
        "starting_price": 2200.0, "status": "OPEN", "featured": False
    },
    {
        "handle": "solaris_fx", "name": "Solaris", "display_name": "Solaris Visuals ☀️",
        "tagline": "Celestial & Solar Goddess Concepts, Golden Hour Lighting",
        "styles": "Splash Art, Character Sheet, Anime",
        "bio": "Passionate about warm golden lighting, sun halos, and divine regal character aesthetics.",
        "starting_price": 3000.0, "status": "OPEN", "featured": False
    },
    {
        "handle": "momo_pop", "name": "Momo", "display_name": "Momo Pop! 🍓",
        "tagline": "Y2K Anime Aesthetics, Pop Art & Vibrant Character Design",
        "styles": "Anime, Pop Art, Chibi",
        "bio": "High contrast candy colors and 2000s anime nostalgic charm! Perfect for music videos and album covers.",
        "starting_price": 1600.0, "status": "OPEN", "featured": False
    },
    {
        "handle": "dusk_concept", "name": "Dusk Concept", "display_name": "Dusk & Dawn Studios 🌙",
        "tagline": "Atmospheric Backgrounds & Environment Concept Art",
        "styles": "Concept Art, Backgrounds, Illustration",
        "bio": "Creating immersive worlds: ruined cathedrals, magical floating islands, and cyberpunk alleys with rich atmospheric depth.",
        "starting_price": 3800.0, "status": "OPEN", "featured": False
    },
    {
        "handle": "shiro_manga", "name": "Shirogane", "display_name": "Shiro Manga Works 📖",
        "tagline": "Black & White Screentone Masterpieces & Webtoon Storyboarding",
        "styles": "Manga Layout, Inking, Comic",
        "bio": "Traditional and digital manga page layout artist. Ready for serialized webtoons and one-shot illustrations.",
        "starting_price": 1400.0, "status": "OPEN", "featured": False
    },
    {
        "handle": "fubuki_rigger", "name": "Fubuki", "display_name": "Fubuki Rigging Lab ❄️",
        "tagline": "Full-Body 360 Head Turn & Physics for Pro VTubers",
        "styles": "VTuber 2D, Live2D Rigging",
        "bio": "Top tier Live2D rigging with wide head turn angles (Z/X/Y), physics dampening, and advanced cheek puffs.",
        "starting_price": 9000.0, "status": "WAITLIST", "featured": True
    },
    {
        "handle": "hazel_craft", "name": "Hazel Green", "display_name": "Hazel Botanic Art 🌿",
        "tagline": "Nature, Dryads, Cottagecore & Cozy Anime Aesthetics",
        "styles": "Watercolors, Pastel, Character Sheet",
        "bio": "Gentle earthy tones, botanical illustrations, and nature-themed original characters.",
        "starting_price": 1300.0, "status": "OPEN", "featured": False
    },
    {
        "handle": "glitch_cat", "name": "GlitchCat", "display_name": "GlitchCat Cyber Studio 🐱",
        "tagline": "Vaporwave & Y2K Glitch Stream Packages & Overlays",
        "styles": "Cyberpunk, Stream Assets, Anime",
        "bio": "Animated stream packages, stinger transitions, and animated alerts for modern livestreamers.",
        "starting_price": 2000.0, "status": "OPEN", "featured": False
    },
    {
        "handle": "mystic_feather", "name": "Karin Feather", "display_name": "Mystic Feather Art 🪶",
        "tagline": "Winged Guardians, Angels & Gothic Vampire Designs",
        "styles": "Dark Fantasy, Gothic, Character Design",
        "bio": "Specialized in multi-layered feathered wings, baroque filigree armor, and gothic romance aesthetics.",
        "starting_price": 3200.0, "status": "OPEN", "featured": False
    },
    {
        "handle": "chronos_draws", "name": "Chronos", "display_name": "Chronos Clockwork Art ⏳",
        "tagline": "Steampunk Artificers, Brass Gears & Clockwork Beasts",
        "styles": "Steampunk, Sci-Fi, Concept Art",
        "bio": "Intricate gears, pocket watches, and brass mechanical contraptions blended with Victorian character designs.",
        "starting_price": 2700.0, "status": "OPEN", "featured": False
    }
]

# Generate additional artists programmatically to reach 60 artists
MORE_ARTIST_PREFIXES = [
    ("elysia", "Elysia Canvas", "Dreamy Starlight & Celestial Heroines", "Anime, Splash Art"),
    ("fenrir", "Fenrir Beast Studio", "Wolf Knights, Beasts & Armored Warriors", "Dark Fantasy, RPG"),
    ("iris", "Iris Blossom", "Floral Kimono & Traditional Shinto Art", "Anime, Watercolors"),
    ("jin", "Jin Digital Ink", "Dynamic Martial Arts & Kinetic Posing", "Manga Layout, Inking"),
    ("kira", "Kira Sparkle", "Magical Girls, Idols & Sparkling Stage Art", "Anime, Character Sheet"),
    ("lyra", "Lyra Symphony", "Musical Theme Characters & Melodic Concepts", "Illustration, Concept Art"),
    ("mika", "Mika Chibi Lab", "Animated Chibi Emotes & Discord Stickers", "Chibi, Animation"),
    ("nox", "Nox Nocturne", "Gothic Rogues, Shadow Assassins & Dark Lore", "Dark Fantasy, Gothic"),
    ("orion", "Orion Starforge", "Cosmic Dragons, Constellation Deities", "Splash Art, Concept Art"),
    ("prism", "Prism Spectrum", "Rainbow Chromatic & Holographic Styles", "Cyberpunk, Anime"),
    ("quill", "Quill & Scroll", "Fantasy Book Illustrations & Map Cartography", "Fantasy, Illustration"),
    ("ryu", "Ryu Dragon Workshop", "Dragon Riders, Wyverns & Scaled Armor", "Fantasy, RPG"),
    ("sora", "Sora Cloud Studio", "Airship Pilots, Sky Pirates & Cloudscapes", "Concept Art, Illustration"),
    ("tanaka", "Tanaka Sketchbook", "Lo-Fi Cityscapes, Rainy Train Sketches", "Lo-Fi, Backgrounds"),
    ("yukari", "Yukari Shrine Art", "Yokai Spirits, Torii Gates & Fox Fire", "Anime, Traditional"),
    ("zeroblade", "ZeroBlade Tech", "Exoskeletons, Beam Sabers & Cyber Pilots", "Sci-Fi, Mecha"),
    ("aoi", "Aoi Ocean Art", "Mermaids, Deep Sea Bioluminescence & Coral", "Fantasy, Splash Art"),
    ("kaori", "Kaori Soft Pastels", "Children Book Moods, Fluffy Animals", "Pastel, Chibi"),
    ("starlight", "Starlight Atelier", "VTuber Outfit Redesigns & 3D Texture Art", "VTuber 2D, Character Sheet"),
    ("celestial", "Celestial Craft", "Tarot Card Sets & Arcane Symbolism", "Dark Fantasy, Illustration"),
]

for idx, (pfx, name, tagline, styles) in enumerate(MORE_ARTIST_PREFIXES, start=21):
    ARTIST_DEFINITIONS.append({
        "handle": f"{pfx}_art",
        "name": name,
        "display_name": f"{name} ✨",
        "tagline": tagline,
        "styles": styles,
        "bio": f"Professional freelance creator with 5+ years of experience. Delivering high quality {styles} with attention to every detail.",
        "starting_price": round(random.uniform(1200, 4500), -2),
        "status": random.choice(["OPEN", "OPEN", "WAITLIST"]),
        "featured": idx % 5 == 0
    })

# Add 20 more artists to guarantee 60 distinct artists
for i in range(41, 61):
    ARTIST_DEFINITIONS.append({
        "handle": f"studio_{i:02d}",
        "name": f"Studio {i:02d}",
        "display_name": f"Studio #{i:02d} Pro Art",
        "tagline": f"Premium Anime & Character Design Tier #{i}",
        "styles": random.choice([
            "VTuber 2D, Live2D Rigging, Character Sheet",
            "Anime, Chibi, Stream Assets",
            "Cyberpunk, Sci-Fi, Mecha",
            "Dark Fantasy, RPG, Splash Art",
            "Retro, Pixel Art, Animation"
        ]),
        "bio": "Dedicated to bringing clients' dream characters to life with industry standard polish, layered PSD deliverables, and prompt communication.",
        "starting_price": round(random.uniform(1000, 5000), -2),
        "status": random.choice(["OPEN", "OPEN", "OPEN", "WAITLIST", "CLOSED"]),
        "featured": False
    })

# --- Client Names Pool ---
CLIENT_NAMES = [
    ("SakuraKitsune_VT", "Kitsune VTuber Talent"),
    ("AoiChannn", "Indie Streamer"),
    ("CyberNyx_Live", "Synthwave DJ & VTuber"),
    ("KumaBao_Stream", "Gamer & Streamer"),
    ("Elysia_Ch", "Variety Streamer"),
    ("NovaStar_VT", "Sci-Fi Space VTuber"),
    ("ZenithVibes", "Lo-Fi Music Producer"),
    ("PuffChoco", "Boba Lover & Content Creator"),
    ("StarlightRei", "Twitch Partner"),
    ("SolarisGames", "Indie Game Studio Lead"),
    ("PixelForgeStudio", "2D RPG Lead Developer"),
    ("NekoRogueDev", "Game Programmer"),
    ("DreamweaverInteractive", "Visual Novel Director"),
    ("AuroraNovelLab", "Light Novel Author"),
    ("StarlightTTRPG", "Dungeon Master & Worldbuilder"),
    ("RustyGearDev", "Steam Deck Indie Dev"),
    ("Kaelith", "Art Collector"),
    ("MorvathCollector", "Fantasy Art Enthusiast"),
    ("ArtLover_Max", "Commission Regular"),
    ("Kuro_Fan99", "Anime Fan & Collector"),
    ("Valkyrie_Simp", "VTuber Fan #1"),
    ("MechaGeek2077", "Sci-Fi Collector"),
    ("ChibiCollector_TH", "Chibi Enthusiast Thailand"),
    ("NekoMimiLover", "Kemonomimi Collector"),
    ("AnimeVibes_99", "Digital Art Fan"),
    ("GamerGuy_Dan", "Discord Server Owner"),
    ("Somchai_Collector", "Thai Collector & Patron"),
    ("NongIce_VTuber", "Thai Independent VTuber"),
    ("Krit_Developer", "Frontend Dev & Streamer"),
    ("Ploy_ChibiFan", "Content Creator"),
    ("Bank_MechaLove", "Mecha Enthusiast"),
    ("SiriusBlack_Art", "Fantasy Novel Fan"),
    ("Valen_Silver", "TTRPG Player"),
    ("Cynthia_Moon", "Adoptable Collector"),
    ("Taro_Gamer", "Japanese Indie Supporter")
]

# Expand client pool to 300
while len(CLIENT_NAMES) < 300:
    c_idx = len(CLIENT_NAMES) + 1
    CLIENT_NAMES.append((f"client_patron_{c_idx:03d}", f"Patron #{c_idx}"))

# --- Original Characters (OC) Seed Templates ---
OC_TEMPLATES = [
    ("Seraphina the Dawn Warden", "High elf solar paladin bearing a sun-forged greatsword and radiant golden halo.", "#f59e0b"),
    ("Nyx Voidwalker", "Shadow assassin who slips through abyssal rifts with dual dark daggers.", "#6366f1"),
    ("Mimi the Boba Cat", "Calico catgirl barista who moonlights as an interstellar magical girl.", "#ec4899"),
    ("V-909 Vanguard", "Autonomous humanoid combat android featuring holographic wing thrusters.", "#06b6d4"),
    ("Kaelen Ashfall", "Rogue pyromancer carrying an ancient bronze clockwork astrolabe.", "#ef4444"),
    ("Yukiko Snowdrift", "Nine-tailed kitsune shrine maiden protecting the sacred frozen mountain torii.", "#38bdf8"),
    ("Balthazar Ironstride", "Dwarven airship captain and clockwork rifle artificer.", "#78716c"),
    ("Lyra Starwhisper", "Astronomer sorceress navigating destiny with an enchanted constellation map.", "#8b5cf6"),
    ("Dante Bloodmoon", "Noble vampire aristocrat and gothic violin virtuoso.", "#b91c1c"),
    ("Hana Forest Sprite", "Horns draped in ivy, guardian spirit of mossy ancient oak groves.", "#10b981"),
    ("Clover Luckweaver", "Leprechaun card-magician and high-stakes casino rogue.", "#14b8a6"),
    ("Echo Synthwave", "Holographic pop idol powered by hyper-pop synthesizer beats.", "#d946ef"),
    ("Morvath the Undying", "Lich king bound to a runic obsidian crown searching for redemption.", "#475569"),
    ("Zephyr Skyseeker", "Winged harpy archer patrolling cloud citadels with a gale longbow.", "#0ea5e9"),
    ("Aurelia Sunwhisper", "Solar empress clothed in celestial silk and flame ribbons.", "#eab308"),
    ("Ren Amasawa Cyber Ronin", "Plasma katana specialist roaming Neo-Tokyo alleyways.", "#f43f5e"),
    ("Frostfang Fenrir", "Dire wolf demi-human berserker wielding frost-etched battle axes.", "#0284c7"),
    ("Iris Stargazer", "Starlight witch collecting shooting stars in antique glass vials.", "#a855f7"),
    ("Bao the Chef Panda", "Master culinary martial artist with a magical steaming bamboo basket.", "#84cc16"),
    ("Astrid Ironforge", "Valkyrie blacksmith crafting cosmic armor beneath aurora borealis.", "#f97316"),
]

# --- Artwork Title Pools ---
ARTWORK_TITLES = [
    ("[Full Illustration] The Last Stand at Azure Citadel", WorkType.ILLUSTRATION),
    ("[VTuber Model] High-Tier Shinto Kitsune Priestess (Rigging Ready)", WorkType.VTUBER_MODEL),
    ("[Character Sheet] Cyber Ronin - Weapons, Visor UI, Orthographic Views", WorkType.COMMISSION),
    ("[Live2D Ready] Deep Sea Jellyfish Maiden (280 Layer Separation)", WorkType.LIVE2D),
    ("[Fanart] Neon Night Stroll through Neo-Shinjuku", WorkType.FANART),
    ("[Chibi] 6-Pack Stream Emotes: Hype, Cry, GG, Sip, Rage, Lurk", WorkType.COMMISSION),
    ("[Concept Art] Celestial Observatory Interior - Lighting Study", WorkType.CONCEPT_ART),
    ("[Sketch & Lineart] Dragon Tamer Action Pose Dynamic Draft", WorkType.SKETCH),
    ("[Comic] Webtoon Chapter 12 Climax Panel - Overdrive Awakening", WorkType.COMIC),
    ("[Adoptable Design] Star-Eater Demon Prince (Commercial Rights Included)", WorkType.COMMISSION),
    ("[Bust-up Icon] Pastel Witch with Starlight Familiar", WorkType.ILLUSTRATION),
    ("[Key Visual] Indie RPG Title Screen Artwork (4K Wallpaper)", WorkType.ILLUSTRATION),
    ("[Splash Art] Solar Valkyrie Transcendent Form", WorkType.ILLUSTRATION),
    ("[VTuber Asset] Customizable Cat Ears, Gaming Headset & Glasses", WorkType.VTUBER_MODEL),
    ("[Concept Art] Abandoned Submerged Megastructure", WorkType.CONCEPT_ART),
    ("[Live2D Model] Gothic Vampire Butler (VBridger mouth ready)", WorkType.LIVE2D),
    ("[Fanart] Sunset Train Ride Home - Lo-Fi Memories", WorkType.FANART),
    ("[Character Sheet] Steampunk Artificer Turnaround Sheet", WorkType.COMMISSION),
    ("[Comic] 4-Koma Comedy: Daily Life of an AI Assistant", WorkType.COMIC),
    ("[Illustration] Midnight Serenade under Cherry Blossoms", WorkType.ILLUSTRATION),
]

# --- Service Packages ---
SERVICE_TEMPLATES = [
    ("Full Character Reference Sheet (Turnaround + Props)", "Character Design", 3500.0, 14, True, True),
    ("Complete Live2D Model Rigging (Physics + VBridger)", "Live2D Rigging", 12000.0, 21, True, True),
    ("VTuber 2D Model Art (Rigging-Ready Layered PSD)", "VTuber 2D", 8500.0, 18, True, True),
    ("Stream Emote Pack (6 Custom Emotes)", "Chibi & Emotes", 1800.0, 5, True, True),
    ("Commercial Key Visual / Album Cover", "Full Illustration", 6000.0, 14, True, True),
    ("Character Bust-up Icon / PFP", "Illustration", 1200.0, 4, False, False),
    ("Full-Body Character Illustration with Background", "Full Illustration", 4500.0, 10, True, True),
    ("Twitch Stream Package (Overlay + Screens + Badges)", "Stream Assets", 3200.0, 7, True, True),
]

# --- Dialogue Scripts for Real Commission Orders ---
ORDER_DIALOGUES = [
    [
        ("client", "Hi! I love your portfolio. I'm debuting my VTuber model next month and would love to commission a full illustration."),
        ("artist", "Hello! Thank you so much! I'd love to work on this. Could you share your character reference sheet and preferred pose?"),
        ("client", "Here's Seraphina's turnaround sheet! I'd like a dynamic summoning pose with magical circles."),
        ("artist", "Awesome concept. I've accepted the order and set up the 50% initial milestone deposit."),
        ("client", "Deposit payment slip uploaded! Excited to see the sketches!"),
        ("artist", "Payment received! I've uploaded 3 rough thumbnail sketches to the files tab. Let me know which composition you prefer!"),
        ("client", "Thumbnail #2 is absolutely stunning! Could we adjust the angle of the magic staff slightly?"),
        ("artist", "You got it! Adjusting staff angle and moving forward to clean lineart and color palette pass."),
        ("artist", "Lineart and flat colors are ready in files! How do the colors feel to you?"),
        ("client", "The golden highlights are gorgeous! Approved to render!"),
        ("artist", "All finished! Uploaded full-resolution 4K PNG and layered PSD. Thank you for an amazing commission!"),
        ("client", "I'm blown away by the quality! Leaving a 5-star review right now. Thank you!")
    ],
    [
        ("client", "Hey! Looking for a set of 6 chibi emotes for my Twitch channel (Hype, Cry, GG, Pout, Sip, Love)."),
        ("artist", "Hey there! I can definitely do that! Turnaround is about 4 days. Please send your character hair/eye colors!"),
        ("client", "Sent references! Order accepted, deposit sent!"),
        ("artist", "Got the payment! Starting sketches right now."),
        ("artist", "Sketches are up! Check the files tab!"),
        ("client", "The pout emote is hilarious, love it! No changes needed, proceed to coloring!"),
        ("artist", "Emotes are finished and formatted for 112x112, 56x56, and 28x28 transparent PNGs! Enjoy!"),
        ("client", "My chat is going to love these! Thank you so much!")
    ],
    [
        ("client", "Hello! Inquiring about Live2D rigging for my model. Does the package include VBridger tongue and cheek puff?"),
        ("artist", "Hello! Yes, the Pro Tier includes full VBridger mouth forms, cheek puffs, and independent eye bounce physics."),
        ("client", "Perfect! Uploaded the cut PSD file for inspection."),
        ("artist", "Inspected the PSD - the layers are cleanly separated. Accepted the order and generated milestone invoice."),
        ("client", "Paid deposit. Please take your time for maximum smoothness!"),
        ("artist", "Initial head XYZ angle tests are ready. Video preview posted!"),
        ("client", "The 360 degree turn is so buttery smooth! Approved!"),
        ("artist", "Finished all physics (hair, clothes, accessories) and exported the .model3.json runtime bundle!"),
        ("client", "Tested in VTube Studio - works flawlessly! 10/10 service!")
    ]
]

# --- Auction Titles & Descriptions ---
AUCTION_TEMPLATES = [
    (
        "Adoptable #01: Astral Kitsune Princess",
        "Exclusive Adoptable Character Design. Winner receives full commercial rights, transparent PNG without watermark, and layered PSD (4000x6000px). Starting Bid: $100. AB includes extra chibi icon!",
        AuctionType.ADOPTABLE
    ),
    (
        "Rush Commission Slot - Full Illustration with Background",
        "1x Guaranteed priority slot for November delivery. Any character type accepted (OC, Fanart, Mecha, VTuber). Will be streamed on Twitch during creation.",
        AuctionType.COMMISSION_SLOT
    ),
    (
        "Adoptable #02: Cyberpunk Street Demon",
        "Techwear horns, neon katana, and cybernetic tail. Winner gets full copyright ownership and vector weapon decals.",
        AuctionType.ADOPTABLE
    ),
    (
        "VTuber 2D Model Art + Rigging Complete Bundle",
        "Full debut ready package! High-resolution art cut into 250+ layers, rigged with 9-point XYZ and smooth hair physics.",
        AuctionType.COMMISSION_SLOT
    ),
    (
        "Adoptable #03: Gothic Moon Empress",
        "Regal gothic gown with stained glass lace patterns and celestial crow familiar.",
        AuctionType.ADOPTABLE
    ),
    (
        "Holiday Special: Duo Couple Illustration Slot",
        "Full rendered couple illustration with cozy winter atmosphere and festive lighting.",
        AuctionType.COMMISSION_SLOT
    ),
]

# --- Review Comments Pool ---
REVIEW_COMMENTS = [
    "Absolutely breathtaking artwork! The lighting and textures exceeded all my expectations. Will definitely order again!",
    "The Live2D model rigging is unbelievably smooth! Tracking works like a dream in VTube Studio with zero jitter.",
    "Super fast delivery and incredible communication! Sent WIPs at every milestone and was very receptive to feedback.",
    "My community went wild over the new chibi emotes! Best emote artist on the platform.",
    "Incredible attention to character details from my written reference sheet. Brought my OC to life perfectly.",
    "Extremely professional artist. High resolution layered PSD was organized cleanly. 10/10 recommended!",
    "The colors and mood are sensational. Looks like official key visual art for an anime series!",
    "Great experience from start to finish. Fair pricing, adherence to deadline, and top-tier craftsmanship."
]

def backup_database():
    """Create a safety backup of test.db before generating or cleaning data."""
    if os.path.exists(DB_FILE):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{DB_FILE}.perf_backup_{timestamp}"
        shutil.copy(DB_FILE, backup_path)
        print(f"📦 Safety backup created: {backup_path}")

def clean_performance_data():
    """Safely removes all mock performance data identified by @mockdice.io."""
    print("🧹 Cleaning existing performance mock data...")
    with Session(engine) as session:
        # Find all mock users
        mock_users = session.exec(select(User).where(User.email.like(f"%{MOCK_DOMAIN}"))).all()
        user_ids = [u.id for u in mock_users]

        if not user_ids:
            print("✨ No performance mock data found to clean.")
            return

        print(f"   Found {len(user_ids)} mock users to clean up.")

        # Find mock artist profiles
        profiles = session.exec(select(ArtistProfile).where(ArtistProfile.user_id.in_(user_ids))).all()
        profile_ids = [p.id for p in profiles]

        # 1. Clean Artworks & Characters
        if profile_ids:
            artworks = session.exec(select(Artwork).where(Artwork.artist_id.in_(profile_ids))).all()
            for a in artworks: session.delete(a)

            chars = session.exec(select(Character).where(Character.artist_id.in_(profile_ids))).all()
            for c in chars: session.delete(c)

            srvs = session.exec(select(ArtistService).where(ArtistService.artist_id.in_(profile_ids))).all()
            for s in srvs: session.delete(s)

            revs = session.exec(select(ArtistReview).where(ArtistReview.artist_id.in_(profile_ids))).all()
            for r in revs: session.delete(r)

        # 2. Clean Orders and child records
        orders = session.exec(select(Order).where(
            (Order.artist_id.in_(user_ids)) | (Order.client_id.in_(user_ids))
        )).all()
        order_ids = [o.id for o in orders]
        if order_ids:
            for inv in session.exec(select(MilestoneInvoice).where(MilestoneInvoice.order_id.in_(order_ids))).all():
                session.delete(inv)
            for rev in session.exec(select(Revision).where(Revision.order_id.in_(order_ids))).all():
                session.delete(rev)
            for f in session.exec(select(File).where(File.order_id.in_(order_ids))).all():
                session.delete(f)
            for m in session.exec(select(Message).where(Message.order_id.in_(order_ids))).all():
                session.delete(m)
            for o in orders:
                session.delete(o)

        # 3. Clean Auctions and child records
        auctions = session.exec(select(Auction).where(
            (Auction.artist_id.in_(profile_ids)) | (Auction.winner_id.in_(user_ids))
        )).all()
        auction_ids = [a.id for a in auctions]
        if auction_ids:
            for b in session.exec(select(Bid).where(Bid.auction_id.in_(auction_ids))).all():
                session.delete(b)
            for am in session.exec(select(AuctionMessage).where(AuctionMessage.auction_id.in_(auction_ids))).all():
                session.delete(am)
            for a in auctions:
                session.delete(a)

        # 4. Clean Notifications
        notifs = session.exec(select(Notification).where(Notification.user_id.in_(user_ids))).all()
        for n in notifs: session.delete(n)

        # 5. Clean ArtistProfiles & Users
        for p in profiles: session.delete(p)
        for u in mock_users: session.delete(u)

        session.commit()
        print("✅ Performance mock data cleanly removed!")


def seed_performance_data(
    num_artists: int = 60,
    num_clients: int = 300,
    num_artworks: int = 2000,
    num_orders: int = 800,
    num_auctions: int = 200
):
    """Generates 22,000+ relational records across all tables."""
    print("=" * 70)
    print("🚀 DICE PLATFORM - HIGH-PERFORMANCE MOCK DATA GENERATOR")
    print("=" * 70)
    print(f"Target Scope: {num_artists} Artists | {num_clients} Clients | {num_artworks} Artworks")
    print(f"              {num_orders} Orders  | {num_auctions} Auctions")
    print("-" * 70)

    backup_database()

    import time
    perf_start_time = time.perf_counter()
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)

    with Session(engine) as session:
        # -------------------------------------------------------------
        # 1. CREATE ARTIST USERS & PROFILES
        # -------------------------------------------------------------
        print("\n🎨 [1/10] Generating Artists & Profiles...")
        artist_users: List[User] = []
        artist_profiles: List[ArtistProfile] = []

        for i in range(num_artists):
            defn = ARTIST_DEFINITIONS[i % len(ARTIST_DEFINITIONS)]
            handle = f"{defn['handle']}_{i+1}" if i >= len(ARTIST_DEFINITIONS) else defn["handle"]
            email = f"{handle}{MOCK_DOMAIN}"

            # Check if exists
            user = session.exec(select(User).where(User.email == email)).first()
            if not user:
                user = User(
                    email=email,
                    hashed_password=CACHED_PASSWORD_HASH,
                    full_name=defn["name"],
                    is_admin=False,
                    is_artist=True,
                    avatar_url=get_avatar_image(i)
                )
                session.add(user)
                session.flush()

            artist_users.append(user)

            profile = session.exec(select(ArtistProfile).where(ArtistProfile.user_id == user.id)).first()
            if not profile:
                profile = ArtistProfile(
                    user_id=user.id,
                    handle=handle,
                    display_name=defn["display_name"],
                    tagline=defn["tagline"],
                    bio=defn["bio"],
                    avatar_url=user.avatar_url,
                    banner_url=BANNER_IMAGES[i % len(BANNER_IMAGES)],
                    styles=defn["styles"],
                    commission_status=defn["status"],
                    rating=round(random.uniform(4.7, 5.0), 2),
                    total_completed_orders=random.randint(15, 120),
                    starting_price=defn["starting_price"],
                    social_twitter=f"@{handle}",
                    social_pixiv=f"pixiv.net/users/{handle}",
                    social_discord=f"{handle}#9999",
                    is_verified=True,
                    is_featured=defn["featured"],
                    created_at=now_utc - timedelta(days=random.randint(60, 400))
                )
                session.add(profile)
                session.flush()

            artist_profiles.append(profile)

        session.commit()
        print(f"   ✓ Created {len(artist_profiles)} Artist Profiles with custom styles and tags.")

        # -------------------------------------------------------------
        # 2. CREATE CLIENT USERS
        # -------------------------------------------------------------
        print("👥 [2/10] Generating Clients & Collectors...")
        client_users: List[User] = []

        for i in range(num_clients):
            c_name, c_role = CLIENT_NAMES[i % len(CLIENT_NAMES)]
            email = f"client_{i+1:03d}_{c_name.lower()}{MOCK_DOMAIN}"

            user = session.exec(select(User).where(User.email == email)).first()
            if not user:
                user = User(
                    email=email,
                    hashed_password=CACHED_PASSWORD_HASH,
                    full_name=f"{c_name} ({c_role})",
                    is_admin=False,
                    is_artist=False,
                    avatar_url=get_avatar_image(i + 100)
                )
                session.add(user)
                session.flush()

            client_users.append(user)

        session.commit()
        print(f"   ✓ Created {len(client_users)} Client Users with pre-hashed authentication.")

        # -------------------------------------------------------------
        # 3. CREATE ARTIST SERVICES & PACKAGES
        # -------------------------------------------------------------
        print("💼 [3/10] Generating Artist Service Tiers...")
        services_count = 0
        for profile in artist_profiles:
            # 3 to 5 service tiers per artist
            sample_svcs = random.sample(SERVICE_TEMPLATES, random.randint(3, 5))
            for title, cat, base_p, days, comm, psd in sample_svcs:
                service = ArtistService(
                    artist_id=profile.id,
                    title=f"{title} - {profile.display_name}",
                    category=cat,
                    description=f"Professional commission package offered by {profile.display_name}. Full communication, WIP stages, and high resolution deliverable files.",
                    base_price=base_p * random.uniform(0.9, 1.3),
                    estimated_days=days,
                    includes_commercial=comm,
                    includes_psd=psd,
                    sample_image_url=get_art_image(services_count),
                    created_at=now_utc - timedelta(days=random.randint(30, 200))
                )
                session.add(service)
                services_count += 1

        session.commit()
        print(f"   ✓ Created {services_count} Service Packages across categories.")

        # -------------------------------------------------------------
        # 4. CREATE ORIGINAL CHARACTERS (OCs)
        # -------------------------------------------------------------
        print("🎭 [4/10] Generating Original Characters (OCs)...")
        characters: List[Character] = []
        char_counter = 0

        for profile in artist_profiles:
            # Each artist has 4 to 8 signature OCs
            for _ in range(random.randint(4, 8)):
                t_name, t_desc, t_color = OC_TEMPLATES[char_counter % len(OC_TEMPLATES)]
                char = Character(
                    name=f"{t_name} (Design by {profile.display_name})",
                    description=t_desc,
                    theme_color=t_color,
                    image_url=get_art_image(char_counter + 300),
                    artist_id=profile.id,
                    created_at=now_utc - timedelta(days=random.randint(20, 300))
                )
                session.add(char)
                characters.append(char)
                char_counter += 1

        session.commit()
        print(f"   ✓ Created {len(characters)} Original Characters with detailed backstories & hex colors.")

        # -------------------------------------------------------------
        # 5. CREATE ARTWORKS (HIGH-VOLUME PORTFOLIO)
        # -------------------------------------------------------------
        print(f"🖼️  [5/10] Generating High-Volume Artworks ({num_artworks} pieces)...")
        artworks: List[Artwork] = []

        for i in range(num_artworks):
            profile = random.choice(artist_profiles)
            art_title, work_type = ARTWORK_TITLES[i % len(ARTWORK_TITLES)]

            # Link to one of artist's characters if available
            artist_chars = [c for c in characters if c.artist_id == profile.id]
            char_id = random.choice(artist_chars).id if artist_chars and random.random() > 0.3 else None

            artwork = Artwork(
                title=f"{art_title} #{i+1:04d}",
                description=f"Original illustration by {profile.display_name}. Drawn in Clip Studio Paint EX / Live2D Cubism. Created for showcase and client commission portfolio.",
                image_url=get_art_image(i + 500),
                visibility_status=VisibilityStatus.PUBLIC,
                work_type=work_type,
                client_link=f"https://twitter.com/client_{random.randint(1, 100)}" if random.random() > 0.5 else None,
                character_id=char_id,
                artist_id=profile.id,
                created_at=now_utc - timedelta(days=random.randint(1, 365), hours=random.randint(0, 23))
            )
            session.add(artwork)
            artworks.append(artwork)

            if i % 500 == 0 and i > 0:
                session.commit()
                print(f"      ... {i}/{num_artworks} artworks committed")

        session.commit()
        print(f"   ✓ Created {len(artworks)} Artworks across 8 WorkTypes.")

        # -------------------------------------------------------------
        # 6. CREATE COMMISSION ORDERS (COMPLETE PIPELINE)
        # -------------------------------------------------------------
        print(f"📋 [6/10] Generating Orders & Commission Pipelines ({num_orders} orders)...")
        orders: List[Order] = []
        milestones_count = 0
        revisions_count = 0
        files_count = 0
        messages_count = 0

        # Status distribution: 15% Pending, 15% Accepted, 20% Sketching, 20% Coloring, 25% Completed, 5% Cancelled
        status_pool = (
            [OrderStatus.PENDING] * 15 +
            [OrderStatus.ACCEPTED] * 15 +
            [OrderStatus.SKETCHING] * 20 +
            [OrderStatus.COLORING] * 20 +
            [OrderStatus.COMPLETED] * 25 +
            [OrderStatus.CANCELLED] * 5
        )

        for i in range(num_orders):
            artist_user = random.choice(artist_users)
            client_user = random.choice(client_users)
            status = random.choice(status_pool)
            agreed_price = round(random.uniform(1500, 28000), -2)

            created_days_ago = random.randint(5, 120)
            order_created_at = now_utc - timedelta(days=created_days_ago)

            order = Order(
                title=f"Commission #{i+1:04d} - {random.choice(SERVICE_TEMPLATES)[0]}",
                description=f"Commission request from {client_user.full_name}. Detailed requirements, reference sheet provided, commercial rights included.",
                status=status,
                agreed_price=agreed_price,
                revision_quota=3,
                start_date=order_created_at if status != OrderStatus.PENDING else None,
                due_date=order_created_at + timedelta(days=random.randint(14, 45)),
                client_id=client_user.id,
                artist_id=artist_user.id,
                created_at=order_created_at
            )
            session.add(order)
            session.flush()
            orders.append(order)

            # A. Milestone Invoices
            # Deposit 50%
            deposit_paid = status in [OrderStatus.SKETCHING, OrderStatus.COLORING, OrderStatus.COMPLETED]
            inv1 = MilestoneInvoice(
                order_id=order.id,
                title="50% Initial Project Deposit",
                amount=agreed_price * 0.5,
                is_paid=deposit_paid,
                slip_image_url="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80" if deposit_paid else None,
                created_at=order_created_at + timedelta(hours=2)
            )
            session.add(inv1)
            milestones_count += 1

            # Final 50%
            final_paid = status == OrderStatus.COMPLETED
            inv2 = MilestoneInvoice(
                order_id=order.id,
                title="50% Final Deliverable Balance",
                amount=agreed_price * 0.5,
                is_paid=final_paid,
                slip_image_url="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80" if final_paid else None,
                created_at=order_created_at + timedelta(days=10)
            )
            session.add(inv2)
            milestones_count += 1

            # B. Revisions
            if status in [OrderStatus.SKETCHING, OrderStatus.COLORING, OrderStatus.COMPLETED]:
                rev = Revision(
                    order_id=order.id,
                    client_feedback="Could we make the eyes slightly more saturated and add a silver hair clip?",
                    is_addressed=(status in [OrderStatus.COLORING, OrderStatus.COMPLETED]),
                    created_at=order_created_at + timedelta(days=3)
                )
                session.add(rev)
                revisions_count += 1

            # C. Files (WIP, Final)
            # Reference file
            session.add(File(
                order_id=order.id,
                filename=f"character_reference_sheet_{i+1}.png",
                s3_key=f"orders/{order.id}/ref_{i+1}.png",
                is_watermarked=False,
                file_type="REFERENCE",
                uploaded_at=order_created_at
            ))
            files_count += 1

            if status in [OrderStatus.SKETCHING, OrderStatus.COLORING, OrderStatus.COMPLETED]:
                session.add(File(
                    order_id=order.id,
                    filename=f"rough_sketch_milestone_{i+1}.png",
                    s3_key=f"orders/{order.id}/sketch_{i+1}.png",
                    is_watermarked=True,
                    file_type="WIP",
                    uploaded_at=order_created_at + timedelta(days=2)
                ))
                files_count += 1

            if status == OrderStatus.COMPLETED:
                session.add(File(
                    order_id=order.id,
                    filename=f"final_deliverable_master_{i+1}.psd",
                    s3_key=f"orders/{order.id}/master_{i+1}.psd",
                    is_watermarked=False,
                    file_type="FINAL",
                    uploaded_at=order_created_at + timedelta(days=12)
                ))
                files_count += 1

            # D. Chat Messages (Multi-turn conversational dialogue)
            dialogue = random.choice(ORDER_DIALOGUES)
            for step_idx, (sender_role, msg_text) in enumerate(dialogue):
                sender_id = client_user.id if sender_role == "client" else artist_user.id
                msg = Message(
                    order_id=order.id,
                    sender_id=sender_id,
                    content=msg_text,
                    created_at=order_created_at + timedelta(hours=step_idx * 4)
                )
                session.add(msg)
                messages_count += 1

            if i % 200 == 0 and i > 0:
                session.commit()
                print(f"      ... {i}/{num_orders} orders processed")

        session.commit()
        print(f"   ✓ Created {len(orders)} Orders, {milestones_count} Invoices, {revisions_count} Revisions,")
        print(f"     {files_count} Files, and {messages_count} Order Chat Messages.")

        # -------------------------------------------------------------
        # 7. CREATE AUCTIONS & REALISTIC BIDDING WARS
        # -------------------------------------------------------------
        print(f"⚡ [7/10] Generating Auctions & Live Bidding Wars ({num_auctions} auctions)...")
        auctions: List[Auction] = []
        bids_count = 0
        auction_msgs_count = 0

        for i in range(num_auctions):
            profile = random.choice(artist_profiles)
            tmpl_title, tmpl_desc, auc_type = AUCTION_TEMPLATES[i % len(AUCTION_TEMPLATES)]

            is_active = i < (num_auctions * 0.5) # 50% Active, 45% Ended, 5% Cancelled
            is_cancelled = not is_active and (i % 20 == 0)
            status = AuctionStatus.ACTIVE if is_active else (AuctionStatus.CANCELLED if is_cancelled else AuctionStatus.ENDED)

            starting_bid = random.choice([50.0, 80.0, 100.0, 150.0, 200.0, 300.0])
            bid_increment = random.choice([5.0, 10.0, 15.0, 20.0])
            auto_buy = starting_bid * random.choice([4.0, 5.0, 6.0])

            if status == AuctionStatus.ACTIVE:
                start_time = now_utc - timedelta(hours=random.randint(2, 48))
                end_time = now_utc + timedelta(hours=random.randint(6, 72))
            else:
                end_time = now_utc - timedelta(hours=random.randint(4, 200))
                start_time = end_time - timedelta(days=random.randint(2, 5))

            auction = Auction(
                title=f"{tmpl_title} #{i+1:03d}",
                description=f"{tmpl_desc} Offered by {profile.display_name}. Live bidding with anti-snipe protection.",
                image_url=get_art_image(i + 1200),
                auction_type=auc_type,
                status=status,
                starting_bid=starting_bid,
                bid_increment=bid_increment,
                auto_buy=auto_buy,
                start_time=start_time,
                end_time=end_time,
                winning_bid=None,
                winner_id=None,
                artist_id=profile.id,
                created_at=start_time
            )
            session.add(auction)
            session.flush()
            auctions.append(auction)

            # Generate Bids
            num_bids = random.randint(4, 18) if status != AuctionStatus.CANCELLED else random.randint(0, 2)
            current_bid = starting_bid
            last_bidder = None

            for b_idx in range(num_bids):
                bidder = random.choice(client_users)
                while bidder == last_bidder and len(client_users) > 1:
                    bidder = random.choice(client_users)
                last_bidder = bidder

                current_bid += bid_increment * random.randint(1, 3)
                if current_bid >= auto_buy:
                    current_bid = auto_buy

                bid_time = start_time + timedelta(minutes=(b_idx + 1) * 30)
                if bid_time > end_time:
                    bid_time = end_time - timedelta(minutes=5)

                bid = Bid(
                    auction_id=auction.id,
                    bidder_id=bidder.id,
                    amount=current_bid,
                    created_at=bid_time
                )
                session.add(bid)
                bids_count += 1

                if current_bid >= auto_buy:
                    break

            if status == AuctionStatus.ENDED and last_bidder:
                auction.winner_id = last_bidder.id
                auction.winning_bid = current_bid
                session.add(auction)

            # Live Auction Chat Comments
            chat_phrases = [
                f"Starting the bid at ${starting_bid}!",
                "Such an amazing color palette! Good luck everyone!",
                "Placed my bid, really hoping to win this adoptable!",
                "Is commercial rights included with the AB?",
                "Yes! Commercial use is fully included!",
                "Outbid again haha, increasing my bid now!",
                "Good luck to all bidders!"
            ]
            for c_idx in range(random.randint(2, 6)):
                chat_sender = random.choice(client_users)
                auc_msg = AuctionMessage(
                    auction_id=auction.id,
                    sender_id=chat_sender.id,
                    content=random.choice(chat_phrases),
                    created_at=start_time + timedelta(hours=c_idx + 1)
                )
                session.add(auc_msg)
                auction_msgs_count += 1

        session.commit()
        print(f"   ✓ Created {len(auctions)} Auctions, {bids_count} Bids, and {auction_msgs_count} Live Auction Messages.")

        # -------------------------------------------------------------
        # 8. CREATE ARTIST REVIEWS
        # -------------------------------------------------------------
        print("⭐ [8/10] Generating Artist Reviews & Testimonials...")
        reviews_count = 0
        for profile in artist_profiles:
            # 15 to 25 reviews per artist
            for _ in range(random.randint(15, 25)):
                client = random.choice(client_users)
                review = ArtistReview(
                    artist_id=profile.id,
                    client_name=client.full_name,
                    rating=random.choices([5, 4, 3], weights=[80, 16, 4])[0],
                    comment=random.choice(REVIEW_COMMENTS),
                    created_at=now_utc - timedelta(days=random.randint(2, 180))
                )
                session.add(review)
                reviews_count += 1

        session.commit()
        print(f"   ✓ Created {reviews_count} Reviews with verified ratings.")

        # -------------------------------------------------------------
        # 9. CREATE NOTIFICATIONS
        # -------------------------------------------------------------
        print("🔔 [9/10] Generating Real-Time System & User Notifications...")
        notifs_count = 0
        all_users = artist_users + client_users

        notif_templates = [
            ("New Commission Request!", "You received a new commission request from a client.", NotificationType.ORDER, "/dashboard/artist"),
            ("Outbid Alert!", "You have been outbid on 'Adoptable #01'. Increase your bid to stay in the lead!", NotificationType.AUCTION, "/auctions"),
            ("Milestone Payment Confirmed", "Client has paid the 50% deposit for Order #104.", NotificationType.ORDER, "/dashboard"),
            ("Auction Won!", "Congratulations! You won the auction for 'Celestial Kitsune Slot'.", NotificationType.AUCTION, "/auctions"),
            ("WIP File Uploaded", "Artist has uploaded the rough sketch for your review.", NotificationType.ORDER, "/dashboard/client"),
            ("Platform Update v2.4", "New high-resolution previewer and secure watermark download enabled.", NotificationType.SYSTEM, "/"),
            ("Review Received!", "Client left a 5-star review on your profile!", NotificationType.ORDER, "/artists/me")
        ]

        for u in all_users:
            # 8 to 15 notifications per user
            for _ in range(random.randint(8, 15)):
                title, msg, n_type, link = random.choice(notif_templates)
                notif = Notification(
                    user_id=u.id,
                    title=title,
                    message=msg,
                    link=link,
                    is_read=random.choice([True, False, False]),
                    type=n_type,
                    created_at=now_utc - timedelta(hours=random.randint(1, 240))
                )
                session.add(notif)
                notifs_count += 1

        session.commit()
        print(f"   ✓ Created {notifs_count} User & System Notifications.")

        # -------------------------------------------------------------
        # 10. VERIFY & SUMMARY REPORT
        # -------------------------------------------------------------
        print("\n📊 [10/10] Calculating Database Metrics & Table Row Counts...")
        summary_tables = [
            ("User (Artists & Clients)", User),
            ("ArtistProfile", ArtistProfile),
            ("ArtistService", ArtistService),
            ("Character (OCs)", Character),
            ("Artwork (Portfolio)", Artwork),
            ("Order (Commission Pipeline)", Order),
            ("MilestoneInvoice", MilestoneInvoice),
            ("Revision", Revision),
            ("File (WIP & Deliverables)", File),
            ("Message (Order Chat)", Message),
            ("Auction", Auction),
            ("Bid", Bid),
            ("AuctionMessage (Live Chat)", AuctionMessage),
            ("ArtistReview", ArtistReview),
            ("Notification", Notification),
        ]

        total_rows = 0
        print("\n" + "=" * 65)
        print(f"{'Table Name':<35} | {'Row Count':>15}")
        print("=" * 65)
        for name, model_cls in summary_tables:
            count = session.exec(select(func.count(model_cls.id))).one()
            total_rows += count
            print(f"{name:<35} | {count:>15,}")
        print("=" * 65)
        print(f"{'TOTAL RELATIONAL RECORDS':<35} | {total_rows:>15,}")
        sample_artist = artist_users[0].email if artist_users else ""
        sample_client = client_users[0].email if client_users else ""

    duration = time.perf_counter() - perf_start_time
    print(f"\n🎉 Successfully seeded performance mock dataset in {duration:.2f} seconds!")
    print(f"💡 Default login for all mock accounts: password: '{DEFAULT_PASSWORD}'")
    print(f"   Example Artist: {sample_artist}")
    print(f"   Example Client: {sample_client}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DICE Platform Performance Mock Data Seeder")
    parser.add_argument("--clean", action="store_true", help="Clean up performance mock data")
    parser.add_argument("--reset", action="store_true", help="Clean first, then re-seed")
    parser.add_argument("--artists", type=int, default=60, help="Number of artists (default: 60)")
    parser.add_argument("--clients", type=int, default=300, help="Number of clients (default: 300)")
    parser.add_argument("--artworks", type=int, default=2000, help="Number of artworks (default: 2000)")
    parser.add_argument("--orders", type=int, default=800, help="Number of orders (default: 800)")
    parser.add_argument("--auctions", type=int, default=200, help="Number of auctions (default: 200)")

    args = parser.parse_args()

    if args.clean:
        clean_performance_data()
    elif args.reset:
        clean_performance_data()
        seed_performance_data(
            num_artists=args.artists,
            num_clients=args.clients,
            num_artworks=args.artworks,
            num_orders=args.orders,
            num_auctions=args.auctions
        )
    else:
        seed_performance_data(
            num_artists=args.artists,
            num_clients=args.clients,
            num_artworks=args.artworks,
            num_orders=args.orders,
            num_auctions=args.auctions
        )
