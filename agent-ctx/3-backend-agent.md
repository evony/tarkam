# Task 3 - Upper Semi Bracket Backend Implementation

## Summary
Implemented the Upper Semi (Double Elimination) bracket format for the Tarkam tournament app.

## Changes Made

### 1. prisma/schema.prisma
- Added `upper_semi` to Tournament `format` field comment

### 2. src/app/api/tournaments/route.ts
- Added `'upper_semi'` to `validFormats` array
- Updated error message to include `upper_semi`

### 3. src/app/api/tournaments/[id]/generate-bracket/route.ts
- Added complete upper_semi bracket generation block (after single_elimination, before group_stage)
- Supports 4-8 teams with correct double elimination structure
- Removed duplicate Swiss code (was lines 345-465)
- Teams seeded by power for fair bracket placement
- groupLabels: U{round}-{pos} for UB, L{round}-{pos} for LB, GF for Grand Final

### 4. src/app/api/tournaments/[id]/score/route.ts
- Added `advanceUpperSemi()` function with complete advancement mapping for 4-8 teams
- Modified existing UB advancement condition to exclude upper_semi (has dedicated handler)
- Advancement map handles: UB winner→next UB, UB loser→LB, LB winner→next LB, UB Final→GF, LB Final→GF

## Verification
- `bun run db:push` - schema in sync
- `bun run lint` - no errors
