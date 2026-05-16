# Task 2-6: Add Share Buttons to Bracket, Hasil, Peringkat, Champions, and Club Profile

## Summary
Added `SharePopup` share buttons to 5 sections across 4 files. The `SharePopup` component was already available at `src/components/idm/social-share-button.tsx` (created by a previous agent). All changes pass TypeScript check and lint with zero errors.

## Changes Made

### 1. Bracket Page (`src/components/idm/bracket-page.tsx`)
- **Import**: Added `import { SharePopup } from './social-share-button';`
- **Location**: In the page header row, added `SharePopup` before the division badges (Male/Female) at `ml-auto` position
- **Props**: shareUrl=`/?view=bracket`, title="Bagikan Bracket", subtitle="Bracket Turnamen", shareText="Lihat bracket turnamen Tarkam IDM!", size="sm"

### 2. BracketHasilSection (`src/components/idm/community-dashboard/index.tsx`)
- **Import**: Added `import { SharePopup } from '../social-share-button';`
- **Location**: In the `BracketHasilSection` header, added `SharePopup` after the "Hasil Pertandingan" title text, before the division pills
- **Props**: shareUrl=`/?view=hasil`, title="Bagikan Hasil", subtitle="Hasil Pertandingan", shareText="Lihat hasil pertandingan Tarkam IDM!", size="sm"

### 3. PeringkatHeader (`src/components/idm/community-dashboard/community-leaderboard.tsx`)
- **Import**: Added `import { SharePopup } from '../social-share-button';`
- **Location**: In the `PeringkatHeader` title row, added `SharePopup` after the "Peringkat" gradient text
- **Props**: shareUrl=`/?view=peringkat`, title="Bagikan Peringkat", subtitle="Peringkat Pemain", shareText="Lihat peringkat pemain Tarkam IDM!", size="sm"

### 4. ReigningChampionPlaque (`src/components/idm/community-dashboard/index.tsx`)
- **Location**: In the plaque header row, added `SharePopup` after the "Reigning Champion" label, before the season badge
- **Props**: shareUrl=`/?view=champion`, title="Bagikan Juara", subtitle="Reigning Champion", shareText="Lihat juara Tarkam IDM!", size="sm"
- Uses the same import added for BracketHasilSection

### 5. Club Profile (`src/components/idm/club-profile.tsx`)
- **Import**: Added `import { SharePopup } from './social-share-button';`
- **Location**: In the banner header, top-right corner (absolute positioned), next to the close/back button (top-left)
- **Props**: shareUrl=`/?view=club&name=<clubName>`, title="Bagikan Klub", subtitle with club name in gold, shareText=`Lihat klub ${club.name} di Tarkam IDM!`, size="sm"

## Verification
- `npx tsc --noEmit`: Zero errors
- `bun run lint`: Zero errors
- Dev server running successfully (GET / 200)
