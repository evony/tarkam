# Task 3-b: Fix Light Theme Visibility in Highlights Section

## Summary
Fixed all 9 light theme visibility issues in `/home/z/my-project/src/components/idm/landing/highlights-section.tsx` by making the component's color system theme-aware using `next-themes`' `useTheme` hook.

## Changes Made

### 1. Added `useTheme` import and theme-aware color helpers
- Imported `useTheme` from `next-themes`
- Created `useIsLightMode()` hook — returns `true` when `resolvedTheme === 'light'`
- Created `usePlatinum(isLight)` — returns darker PLATINUM color variants in light mode (e.g., `nameLight: '#6B6B6B'` instead of `'#F5F5F5'`)
- Created `useMaroon(isLight)` — returns darker MAROON text variants in light mode (e.g., `nameLight: '#800020'` instead of `'#F5C6CB'`)
- Created `goldAccentGradient(isLight, variant)` — returns dark gold gradient in light mode (`#B8960A`/`#92780C` instead of `#EFF923`/`#F9CB25`)
- Created `goldGlowGradient(isLight)` — returns darker gold glow in light mode

### 2. DivisionCard fixes
- Added `isLight = useIsLightMode()` and `greenText` variable
- Replaced hardcoded gold accent bar gradient with `goldAccentGradient(isLight)`
- Replaced hardcoded gold glow with `goldGlowGradient(isLight)`
- Fixed `text-green-400` → theme-aware `greenText` inline style (`#16a34a` in light, `#4ade80` in dark)
- Adjusted box-shadow opacity for light mode

### 3. MvpCard fixes
- Added `isLight`, `platinum = usePlatinum(isLight)`, `greenText`
- Replaced all `PLATINUM.` references with theme-aware `platinum.` (8 locations)
- Replaced gold accent bar with `goldAccentGradient(isLight, isEmpty ? 'simple' : 'full')`
- Replaced gold glow with `goldGlowGradient(isLight)`
- Fixed gamertag `textShadow` — set to `'none'` in light mode (glow invisible on light bg)
- Fixed green wins badge background and text for light mode
- Fixed MVP badge background rgba for light mode
- Adjusted box-shadow opacity for light mode

### 4. SultanCard fixes
- Added `isLight`, `maroon = useMaroon(isLight)`
- Replaced all `MAROON.` references with theme-aware `maroon.` (12+ locations)
- Fixed maroon accent bar gradient for light mode (replaced `#f5c6cb` highlight with `#d4576a`)
- Fixed gamertag `textShadow` — set to `'none'` in light mode
- Fixed Heart icon `color: 'white'` → `color: isLight ? '#800020' : 'white'`
- Fixed tier badge background for light mode
- Adjusted box-shadow opacity for light mode

### 5. HighlightsSection fixes
- Added `isLight = useIsLightMode()`
- Made atmospheric gold radial glow theme-aware (darker gold alpha in light mode)
- `bg-deep` already uses CSS variable with light/dark variants, no change needed

### 6. Verified `text-idm-gold-warm` auto-fix
- Confirmed `idm-gold-warm` resolves to `#92780C` in light mode via Tailwind config — works correctly ✓

## Verification
- ESLint passes cleanly with no errors
- All 9 issues from the task description have been addressed
