# Task 4-a: Fix Light Theme Visibility Issues in experiences-section.tsx

## Summary
Fixed all 10 light theme visibility issues in `/home/z/my-project/src/components/idm/landing/experiences-section.tsx` by introducing a comprehensive theme-aware color system.

## Issues Fixed

### 1. `COLORS.gold (#EFF923)` — bright gold invisible on light bg
**Fix**: Created `tc(isLight)` helper that returns `#92780C` (dark gold) in light mode, `#EFF923` in dark mode. All references to `COLORS.gold` replaced with `c.gold` from the theme-aware helper.

### 2. `COLORS.mutedText (#a09880)` — low contrast on light bg
**Fix**: Light mode returns `#7A6F5A` (darker muted text) for better contrast on light backgrounds.

### 3. `COLORS.lightText (#f5f0e8)` — cream text invisible on light bg
**Fix**: Light mode returns `#2D2A26` (near-black) for text that should be readable on light backgrounds.

### 4. `COLORS.darkBg ('var(--bg-deep)')` — OK, kept as-is
CSS variable already adapts to theme.

### 5. Inline styles using `color: COLORS.gold` (#EFF923)
**Fix**: All inline style references now use `c.gold` from `tc(isLight)`, which returns appropriate color per theme.

### 6. Video titles `color: isActive ? '#ffffff' : COLORS.lightText`
**Fix**: Changed to `color: isActive ? c.activeText : c.lightText`. `c.activeText` returns `#1a1816` in light mode, `#ffffff` in dark mode. `c.lightText` returns `#2D2A26` in light mode.

### 7. `text-white` without dark: counterpart
**Fix**: Changed FeaturedBanner title from `text-white` to `text-foreground dark:text-white`. Bottom gradient overlay also adapted per theme.

### 8. `rgba(6,8,18,0.70)` mesh gradient — dark overlay on light bg
**Fix**: `c.overlayBg` returns `rgba(245,240,232,0.75)` in light mode (warm cream overlay), `rgba(6,8,18,0.70)` in dark mode.

### 9. `rgba(8,10,20,0.6)` vignette — dark overlay on light bg
**Fix**: `c.vignette` returns `radial-gradient(ellipse at center, transparent 30%, rgba(200,195,185,0.35) 100%)` in light mode (subtle warm vignette), dark overlay in dark mode.

### 10. `bg-idm-gold-warm/12 border-idm-gold-warm/20 text-idm-gold-warm`
**Fix**: These Tailwind classes already use `var(--idm-gold-warm)` which resolves to `#92780C` in light mode via CSS variables. No changes needed — they auto-adapt.

## Architecture Changes

### New: `tc(isLight: boolean)` — Theme-aware Color Helper
Replaced the static `COLORS` object with a function that returns a complete set of theme-appropriate colors. Includes:
- Base colors (gold, cyan, purple, mutedText, lightText, activeText)
- Background overlays (overlayBg, vignette, thumbOverlay, progressTrack)
- Border colors (inactiveBorder, progressCardBorder)
- Shadow presets (shadowLight, shadowMedium, shadowHeavy)
- Gradient strings (goldGradient, progressBar, progressBarGlow)
- Component-specific values (comingSoon*, empty*, filterInactiveBorder)

### Updated: `getDivisionConfig(division, isLight)`
Added `isLight` parameter. In light mode:
- "both" division: base color `#92780C` instead of `#EFF923`
- "male" division: base color `#1d4ed8` instead of `#2E9FFF`
- "female" division: base color `#be185d` instead of `#FF2D78`
- All derived rgba values automatically use correct color channels

### Updated: `getTypeConfig(type, isLight)`
Added `isLight` parameter for theme-aware accent color.

### Updated: Component Props
All child components now accept `isLight: boolean`:
- `FilterTabs` — uses theme-aware colors for text, borders
- `FeaturedBanner` — uses theme-aware colors for overlays, text, buttons
- `VideoListItem` — uses theme-aware colors for title, muted text, borders, badges
- `EmptyState` — uses theme-aware colors for gradient text, descriptions, decorations

### Main Component: `ExperiencesSection`
- Added `import { useTheme } from 'next-themes'`
- Uses `resolvedTheme` to detect light/dark mode
- Passes `isLight` to all child components

## Additional Improvements
- Section background radial gradients use theme-appropriate opacity/color channels
- Dot pattern background uses theme-aware color
- Bottom gradient overlay for title readability adapts between light/dark
- Inactive border colors adapted: `rgba(0,0,0,0.08)` in light mode vs `rgba(239,249,35,0.08)` in dark mode
- Shadow values reduced in light mode for subtlety
- Duration badges use theme-appropriate background/text colors when inactive

## Verification
- ESLint: Passed with no errors
- No test code added
