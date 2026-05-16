# Task 4-d: Fix Light Theme Visibility in Tournament Hub

## Summary
Fixed light theme visibility issues in `src/components/idm/landing/tournament-hub.tsx`. The component had several hardcoded dark-mode-only styles (black backgrounds, white text/icons, white tooltips on black) that were invisible or looked wrong in light mode.

## File Modified

### `src/components/idm/landing/tournament-hub.tsx`

1. **Line 170 — Tournament count badge background**: `bg-black/50` → `bg-foreground/5 dark:bg-black/50`
   - Black background looked harsh and out-of-place in light mode; replaced with subtle foreground-tinted bg

2. **Line 197 — Play icon color**: `text-white fill-white` → `text-idm-gold-warm dark:text-white fill-idm-gold-warm dark:fill-white`
   - White play icon was invisible on light backgrounds; gold is visible in both themes
   - Also updated `drop-shadow` from white glow → gold glow in light mode: `drop-shadow-[0_0_4px_rgba(239,249,35,0.3)] dark:drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]`

3. **Line 200 — Video tooltip**: `text-white/80 bg-black/70` → `text-foreground dark:text-white/80 bg-background/90 dark:bg-black/70 border border-border/20 dark:border-0`
   - White text on black bg was fully inverted in light mode; now uses foreground/background semantic colors with a subtle border in light mode

4. **Line 357 — Section background**: `bg-deep` → `bg-deep border-t border-border/10 dark:border-t-0`
   - `bg-deep` already has light mode value (`#f5f0e8`) via CSS variables, but lacked visual separation from adjacent sections in light mode
   - Added a subtle top border in light mode only to create section boundary

5. **Lines 171, 285, 321** — `text-idm-gold-warm` and `bg-idm-gold-warm/5 border-idm-gold-warm/20` etc.
   - Confirmed these auto-fix via CSS variables (gold resolves to `#92780C` in light mode, `#EFF923` in dark mode)
   - No changes needed

## Verification
- ESLint: ✅ `bun run lint` passes with no errors
