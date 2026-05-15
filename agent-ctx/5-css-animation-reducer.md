# Task 5: CSS Animation Reducer

## Summary
Reduced infinite CSS animations in globals.css from 243 lines (247 occurrences) to 18 — a 92.6% reduction.

## Results
- **BEFORE**: 243 lines with `animation:.*infinite` (247 total infinite occurrences)
- **AFTER**: 18 infinite animations remaining

## Animations KEPT (18 essential)
1. `hero-shimmer-sweep` — hero first impression
2. `donor-name-neon-pulse` — donor engagement
3. `donor-name-gold-pulse` — top donor engagement
4. `live-match-pulse` — live match UX signal
5. `live-indicator-pulse` — live indicator UX (2 instances)
6. `live-pulse` — live dot UX signal
7. `marquee` — core ticker functionality
8. `neon-pulse-male` — CTA button attention
9. `neon-pulse-female` — CTA button attention
10. `neon-pulse-community` — CTA button attention
11. `bracket-live-pulse` — live bracket UX signal
12. `hero-btn-glow-pulse` — hero CTA conversion
13. `scroll-bounce` — scroll indicator UX
14. `scroll-dot` — scroll indicator UX
15. `chevron-bounce` — scroll hint UX
16. `hero-scroll-mouse-border` — scroll indicator UX
17. `hero-scroll-dot-move` — scroll indicator UX

## Animations MADE STATIC (225 removed)
All decorative glow/pulse/shimmer/breathe/drift/float/spin/bounce animations including:
- Badge glow/shimmer/breathe (all variants)
- Champion/gold/elite border glow
- Division badge glow
- VS badge glow
- Countdown digit pulse
- Rank badge glow/shimmer (all metals, all instances)
- Tier badge glow
- Tournament border glow/icon pulse
- Spotlight glow/beam/ring
- Leaderboard glow/crown bob
- Footer glow/shimmer
- Hero decorative animations (mesh-shift, shine-sweep, constellation, vignette, geo-float, etc.)
- Skeleton shimmer (all 6 instances)
- All gradient-shift/rotate animations
- All particle/float/drift animations
- All skin animations (8 types)
- All CTA decorative animations (float-1-6, glow-breathe, rotate-border, etc.)
- Casino/bar shimmer
- Progress shimmer/breathe
- MVP spotlight/border/ring pulse (all variants)
- Esports storm/lightning/energy animations
- Aurora drift (3 instances)
- Text gradient shift (3 instances)
- Cinema flare drift
- Avatar shimmer sweep (5 instances)

## Shimmer Overlay Fixes
Added `opacity: 0 !important` to 34 shimmer/sweep pseudo-elements that lost their animation. These overlays were designed to translateX across elements — without animation they'd show as static gradient stripes.

## What was NOT changed
- All @keyframes definitions preserved (320)
- No layout, spacing, or structure changes
- No non-infinite animations touched
- Static visual properties (backgrounds, colors, shadows, borders, text-shadows) preserved

## Verification
- `npx tsc --noEmit`: zero errors
- `bun run lint`: zero errors
- Dev server running: GET / 200
