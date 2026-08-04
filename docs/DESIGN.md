# DESIGN.md - Impeccable Design System & Anti-Pattern Standards

## 1. Aesthetic Direction
**Style**: Studio Editorial & Tactical Creator Portal
**Core Feeling**: Precise, Crafted, High-Readability, Zero-AI Slop.

## 2. Anti-Patterns Explicitly Banned
- ❌ **NO Floating Glowing Blobs**: Never use `blur-[100px]` colored circles floating in backgrounds.
- ❌ **NO Tacky Rainbow/Gradient Text**: Never use `bg-gradient-to-r from-purple to-blue text-transparent`.
- ❌ **NO Over-rounded Nested Cards**: Avoid `rounded-3xl` nested inside another `rounded-3xl`. Use clean `rounded-xl` or `rounded-2xl` with explicit 1px borders.
- ❌ **NO Generic Unstyled Layouts**: Avoid centered generic text columns without structural grid layout.

## 3. Design Tokens & Colors
- **Background**: `#09090b` (Obsidian Dark)
- **Card Surface**: `#121215` (Studio Slate)
- **Borders**: `#27272a` (Crisp Zinc 1px)
- **Primary Accent**: `#3b82f6` (Studio Cobalt)
- **Secondary Accent**: `#e2b857` (Warm Gold / Amber)
- **Status Open**: `#10b981` (Emerald)
- **Status Closed**: `#ef4444` (Rose)

## 4. UI Component Rules
- **Header & Navigation**: Clean 64px height, sticky top blur backdrop (`backdrop-blur-md bg-neutral-950/90`), crisp 1px border.
- **Buttons**: Tactile fill with subtle active scale (`hover:bg-blue-500 transition-colors cursor-pointer`).
- **Cards**: Single-level 1px border (`border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700`).
- **Status Indicators**: Micro dot indicators (`w-2 h-2 rounded-full`) paired with clean uppercase labels.
