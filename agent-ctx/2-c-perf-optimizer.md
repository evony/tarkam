# Task 2-c: Optimize Landing Page for INP & FCP

## Summary
Applied 4 performance optimizations to `/home/z/my-project/src/components/idm/landing-page.tsx` targeting INP (504ms → <200ms) and FCP (2.22s → <1.8s).

## Changes Made

### 1. Dynamic import MarqueeTicker
- **Before**: `import { MarqueeTicker } from './marquee-ticker';` (synchronous, line 16)
- **After**: `const MarqueeTicker = dynamic(() => import('./marquee-ticker').then(m => ({ default: m.MarqueeTicker })), { ssr: false, loading: () => <div className="h-12" /> });`
- **Impact**: Removes MarqueeTicker JS from initial bundle, reducing FCP-blocking JS

### 2. Dynamic import BackToTop & ScrollProgress
- **Before**: Synchronous imports at lines 99-100
- **After**: Two dynamic imports with `ssr: false` and `loading: () => null`
- **Impact**: Removes scroll-utility JS from critical path

### 3. Stagger React Query polling intervals
- `stats female`: `refetchInterval` changed from `300000` (5min) → `330000` (5.5min) — staggered 30s from male
- `league-landing`: `refetchInterval` changed from `600000` (10min) → `660000` (11min) — staggered 1min from cms
- Added `refetchIntervalInBackground: false` to ALL 5 queries (tournament-status, stats male, stats female, cms-content, league-landing)
- **Impact**: Prevents male+female stats from firing simultaneously (INP spike), stops wasted background refetches

### 4. Added `notifyOnChangeProps` to heavy stats queries
- Added `notifyOnChangeProps: ['data', 'error']` to both male and female stats queries
- **Impact**: Reduces unnecessary re-renders from `isLoading`/`isFetching` state changes

## Lint Result
✅ `bun run lint` passes with no errors
