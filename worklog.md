# Worklog — Task 2-b: Optimize API Caching & SSR Revalidation for Vercel Speed Insights

## Date: 2026-03-04

## Task
Optimize API caching and SSR revalidation to reduce TTFB from 1.02s to <0.8s.
Increase CDN cache durations and add proper `stale-while-revalidate` headers.

## Changes Applied

### 1. SSR Cache Revalidation — `/home/z/my-project/src/lib/landing-data.ts`
- **Line 737**: `fetchLandingStatsCached` revalidate changed from `300` → `600` (5min → 10min)
- **Line 900**: `fetchLandingLeagueCached` revalidate changed from `300` → `600` (5min → 10min)
- Rationale: Data barely changes — 10 minutes is fine and cuts SSR DB queries in half

### 2. API Route Cache Headers

#### `/home/z/my-project/src/app/api/stats/route.ts`
- **Surrogate-Key**: Changed from `'league-data'` → `'stats-data'` for targeted revalidation
- Cache-Control already had `s-maxage=60, stale-while-revalidate=300` ✅
- Updated comment to reflect correct CDN cache duration and Surrogate-Key

#### `/home/z/my-project/src/app/api/leaderboard/route.ts`
- **Cache-Control**: Changed from `s-maxage=10, stale-while-revalidate=60` → `s-maxage=60, stale-while-revalidate=300`

#### `/home/z/my-project/src/app/api/rankings/route.ts`
- **Cache-Control**: Changed from `no-store, no-cache, must-revalidate` → `public, s-maxage=60, stale-while-revalidate=300`

#### `/home/z/my-project/src/app/api/feed/route.ts`
- **Cache-Control**: Changed from `s-maxage=30, stale-while-revalidate=60` → `s-maxage=60, stale-while-revalidate=300`

#### `/home/z/my-project/src/app/api/tournament-status/route.ts`
- **Cache-Control**: Changed from `s-maxage=30, stale-while-revalidate=60` → `s-maxage=30, stale-while-revalidate=120`
- Shorter s-maxage because tournament status changes more frequently

#### `/home/z/my-project/src/app/api/league/route.ts`
- Already had `s-maxage=60, stale-while-revalidate=300` ✅ — No changes needed

#### `/home/z/my-project/src/app/api/cms/content/route.ts`
- **Cache-Control**: Changed from `s-maxage=60, stale-while-revalidate=300` → `s-maxage=300, stale-while-revalidate=600`
- CMS content changes very rarely — 5min CDN cache + 10min stale-while-revalidate
- Updated comment to reflect new caching strategy

## Verification
- `bun run lint` — ✅ No errors

---

# Worklog — Task 2-c: Optimize Landing Page INP & FCP

## Date: 2026-03-04

## Task
Optimize the landing page for INP (504ms → target <200ms) and FCP (2.22s → target <1.8s).

## Changes Applied to `/home/z/my-project/src/components/idm/landing-page.tsx`

### Fix 1: Dynamic import MarqueeTicker
- Removed synchronous `import { MarqueeTicker } from './marquee-ticker'` (was line 16)
- Added `const MarqueeTicker = dynamic(() => import('./marquee-ticker').then(m => ({ default: m.MarqueeTicker })), { ssr: false, loading: () => <div className="h-12" /> })` alongside other dynamic imports

### Fix 2: Dynamic import BackToTop & ScrollProgress
- Removed synchronous imports for `BackToTop` and `ScrollProgress` (were lines 99-100)
- Added two dynamic imports with `ssr: false` and `loading: () => null`

### Fix 3: Stagger React Query polling intervals
- `stats female`: `refetchInterval: 300000` → `330000` (5.5min, staggered 30s from male)
- `league-landing`: `refetchInterval: 600000` → `660000` (11min, staggered 1min from cms)
- Added `refetchIntervalInBackground: false` to all 5 queries

### Fix 4: Add `notifyOnChangeProps` to stats queries
- Added `notifyOnChangeProps: ['data', 'error']` to both male and female stats queries

## Verification
- `bun run lint` — ✅ No errors

---
Task ID: 3
Agent: Main Agent
Task: Optimize INP from 576ms to target <200ms by removing useDeferredValue (double renders) and adding React.memo

Work Log:
- Analyzed root cause: `useDeferredValue` causes DOUBLE renders (once with old value, once with new) on every state change — this is the PRIMARY INP killer
- Removed `useDeferredValue` import and all 3 usage calls from community-dashboard/index.tsx
- Replaced all `deferredDivision` → `selectedDivision`, `deferredLeaderboardSort` → `leaderboardSort`, `deferredLeaderboardDivisionFilter` → `leaderboardDivisionFilter`, `deferredEffectiveDivision` → `effectiveDivision` in JSX
- Added `React.memo` wrapper to `DivisionCard` in community-hero.tsx (was not memoized before)
- Added `React.memo` wrapper to `QuickStatsBar` in quick-stats-bar.tsx (was not memoized before)
- Simplified `AnimatedNumber` — removed `requestIdleCallback` complexity, now starts animation directly via `requestAnimationFrame` with `rafRef` for cleanup
- Added `notifyOnChangeProps: ['data', 'error']` to all 3 community dashboard useQuery calls (male stats, female stats, league data)
- Added `notifyOnChangeProps: ['data', 'error']` to 3 landing page queries that were missing it (tournament-status, cms-content, league-landing)
- Increased polling intervals in community dashboard: `refetchInterval` from 180s → 300s (3min → 5min) for all 3 queries
- Kept `startTransition` wrappers on filter/tab changes (useful for marking state updates as interruptible)
- Verified: `npx tsc --noEmit` — no TypeScript errors
- Verified: `bun run lint` — no lint errors
- Verified: All `deferred*` variable references fully removed from codebase

Stage Summary:
- Removed `useDeferredValue` (was causing double renders — the primary INP killer)
- Added `React.memo` to DivisionCard and QuickStatsBar (prevents unnecessary child re-renders)
- Simplified AnimatedNumber (removed requestIdleCallback overhead)
- Added `notifyOnChangeProps` to 6 queries total (prevents isFetching re-renders)
- Increased community dashboard polling from 3min to 5min (reduces background re-renders)
- CLS should remain at 0.1 (placeholderData still active)
- INP should improve significantly due to eliminating double renders
