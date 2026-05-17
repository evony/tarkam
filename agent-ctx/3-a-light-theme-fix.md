# Task 3-a: Fix Light Theme Visibility Issues in players-section.tsx

## Summary
Fixed all light theme visibility issues in `/home/z/my-project/src/components/idm/landing/players-section.tsx` by replacing hardcoded bright colors with CSS variable-based alternatives that adapt to light/dark mode.

## Changes Made

### 1. Section Background (line 85)
- **Before**: `bg-deep` — In light mode, bg-deep is `#f5f0e8` (warm beige), lacking visual separation
- **After**: `bg-deep border-y border-border/30 dark:border-0 shadow-[0_2px_16px_rgba(0,0,0,0.04)] dark:shadow-none`
- Added subtle border and shadow in light mode only, removed in dark mode

### 2. Loading State Badges (line 173)
- **Before**: `bg-[#2E9FFF]/10 text-[#57B5FF] border border-[#2E9FFF]/15` / `bg-[#FF2D78]/10 text-[#FF5C9A] border border-[#FF2D78]/15`
- **After**: `bg-idm-male/10 text-idm-male border border-idm-male/15` / `bg-idm-female/10 text-idm-female border border-idm-female/15`
- Uses CSS variables that resolve to dark blue `#1d4ed8` in light mode and bright `#57B5FF` in dark mode

### 3. Male Division Header Badge (line 196)
- **Before**: `color: '#57B5FF'` — bright blue invisible on light bg
- **After**: `color: 'var(--idm-male)'` — resolves to `#1d4ed8` in light, `#57B5FF` in dark

### 4. Male Gamertag Classes (lines 323-324)
- **Before**:
  - Top3: `'text-[#57B5FF] dark:text-[#57B5FF] text-idm-male'` — conflicting classes, bright blue overrides dark-variant-aware class
  - Default: `'text-white dark:text-white text-foreground group-hover/player:text-[#57B5FF]'` — text-white overrides text-foreground in light mode
- **After**:
  - Top3: `'text-idm-male dark:text-[#57B5FF]'` — uses CSS var in light, bright blue in dark
  - Default: `'text-foreground dark:text-white group-hover/player:text-idm-male dark:group-hover/player:text-[#57B5FF]'` — proper light/dark variants

### 5. Male Club Name (lines 347-348)
- **Before**: `text-[#57B5FF]/80` / `text-[#8FCEFF]/90`
- **After**: `text-idm-male/80` / `text-idm-male-light/90`
- Uses CSS vars: light mode `#1d4ed8`/`#3b82f6`, dark mode `#57B5FF`/`#8FCEFF`

### 6. Male Show More Button (lines 382, 385-395)
- **Before**: `color: '#57B5FF'` in inline style and hover handlers
- **After**: `color: 'var(--idm-male)'` in all three style assignments (initial, enter, leave)
- CSS var adapts automatically to light/dark mode

### 7. Female Division Header Badge (line 424)
- **Before**: `color: '#FF5C9A'` — bright pink
- **After**: `color: 'var(--idm-female)'` — resolves to `#be185d` in light, `#FF5C9A` in dark

### 8. Female Gamertag Classes (lines 551-552)
- **Before**:
  - Top3: `'text-[#FF5C9A] dark:text-[#FF5C9A] text-idm-female'`
  - Default: `'text-white dark:text-white text-foreground group-hover/player:text-[#FF5C9A]'`
- **After**:
  - Top3: `'text-idm-female dark:text-[#FF5C9A]'`
  - Default: `'text-foreground dark:text-white group-hover/player:text-idm-female dark:group-hover/player:text-[#FF5C9A]'`

### 9. Female Club Name (lines 575-576)
- **Before**: `text-[#FF5C9A]/80` / `text-[#FF8FBC]/90`
- **After**: `text-idm-female/80` / `text-idm-female-light/90`

### 10. Female Show More Button (lines 610, 613-623)
- **Before**: `color: '#FF5C9A'` in inline style and hover handlers
- **After**: `color: 'var(--idm-female)'` in all three style assignments

### 11. Empty State Icons (lines 208, 436)
- **Before**: `text-[#2E9FFF]/15` / `text-[#FF2D78]/15`
- **After**: `text-idm-male/15` / `text-idm-female/15`

## CSS Variable Reference (from globals.css)
| Variable | Light Mode | Dark Mode |
|----------|-----------|-----------|
| `--idm-male` | `#1d4ed8` | `#57B5FF` |
| `--idm-male-light` | `#3b82f6` | `#8FCEFF` |
| `--idm-female` | `#be185d` | `#FF5C9A` |
| `--idm-female-light` | `#db2777` | `#FF8FBC` |
| `--idm-gold-warm` | `#92780C` | `#EFF923` |
| `--bg-deep` | `#f5f0e8` | `#060810` |
| `--bg-mid` | `#faf8f4` | `#0a0c16` |

## Lint Result
Passed — `eslint .` exits with no errors.
