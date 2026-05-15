'use client';

import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hexToRgba, formatCurrency } from '@/lib/utils';
import type { StatsData } from '@/types/stats';

/* ═══════════════════════════════════════════════════════════════
   TARKAM IDM — ESPN-STYLE MARQUEE TICKER
   Stats + Live Feed in one seamless scrolling bar
   JS-driven animation with requestAnimationFrame
   ═══════════════════════════════════════════════════════════════ */

/* ========== Speed Configuration ========== */
// Pixels per second — readable ESPN-style ticker speed
const DESKTOP_SPEED = 60;
const MOBILE_SPEED = 40;
const MOBILE_BREAKPOINT = 768;

/* ========== Feed Item Types ========== */
interface FeedItem {
  id: string;
  type: 'transfer' | 'donation' | 'score' | 'champion' | 'mvp' | 'registration' | 'tournament_signup' | 'stat';
  icon: string;
  title: string;
  subtitle: string;
  timestamp: string;
  division?: string;
  accent: string;
  numericValue?: number;
}

/* ========== Time Formatter ========== */
function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Baru';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}j`;
  if (days < 7) return `${days}h`;
  return new Date(timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/* ========== Accent colors per type ========== */
const TYPE_ACCENT: Record<FeedItem['type'], string> = {
  champion: '#EFF923',
  mvp: '#eab308',
  donation: '#22c55e',
  score: '#2E9FFF',
  transfer: '#FF2D78',
  registration: '#57B5FF',
  tournament_signup: '#f59e0b',
  stat: '#EFF923',
};

/* ========== Single Feed Card — Unified compact horizontal style ========== */
function FeedCard({ item }: { item: FeedItem }) {
  const accent = item.accent || TYPE_ACCENT[item.type] || '#EFF923';
  const isStat = item.type === 'stat';

  const displayTitle = isStat && item.numericValue && item.numericValue > 0
    ? item.numericValue.toLocaleString('id-ID')
    : item.title;
  const displaySubtitle = item.subtitle;

  return (
    <div
      className="flex items-center gap-2 px-3.5 py-1.5 rounded-md shrink-0 border select-none"
      style={{
        background: `linear-gradient(135deg, ${hexToRgba(accent, 0x08)} 0%, ${hexToRgba(accent, 0x03)} 100%)`,
        borderColor: hexToRgba(accent, 0x20),
      }}
    >
      <span
        className="text-sm shrink-0"
        style={{ filter: `drop-shadow(0 0 4px ${hexToRgba(accent, 0x40)})` }}
      >
        {item.icon}
      </span>

      <p
        className={`font-bold whitespace-nowrap truncate max-w-[180px] sm:max-w-[220px] ${
          isStat ? 'text-xs' : 'text-[11px] sm:text-xs'
        }`}
        style={{ color: isStat ? accent : undefined }}
      >
        {displayTitle}
      </p>

      {displaySubtitle && (
        <>
          <span className="text-muted-foreground/20 shrink-0 text-[8px]">◆</span>
          <p className="text-[10px] text-muted-foreground/70 truncate max-w-[100px] sm:max-w-[130px] hidden sm:block">
            {displaySubtitle}
          </p>
        </>
      )}

      {!isStat && (
        <span
          className="text-[9px] font-medium shrink-0 tabular-nums px-1.5 py-0.5 rounded"
          style={{ color: hexToRgba(accent, 0xaa), background: hexToRgba(accent, 0x10) }}
        >
          {formatTimeAgo(item.timestamp)}
        </span>
      )}

      {!isStat && item.division && (
        <span
          className="w-2 h-2 rounded-full shrink-0 ring-1 ring-offset-1 ring-offset-background"
          style={{
            backgroundColor: item.division === 'male' ? '#2E9FFF' : '#FF2D78',
            boxShadow: `0 0 6px ${item.division === 'male' ? hexToRgba('#2E9FFF', 0x40) : hexToRgba('#FF2D78', 0x40)}`,
            '--tw-ring-color': item.division === 'male' ? hexToRgba('#2E9FFF', 0x60) : hexToRgba('#FF2D78', 0x60),
          } as React.CSSProperties}
        />
      )}
    </div>
  );
}

/* ========== Separator ========== */
function Separator() {
  return (
    <span className="text-[8px] text-idm-gold-warm/25 shrink-0 mx-1 select-none">◆</span>
  );
}

/* ========== Combined Marquee Props ========== */
interface UnifiedMarqueeProps {
  maleData?: StatsData;
  femaleData?: StatsData;
  leagueData?: any;
}

/* ========== Unified Marquee — JS-driven rAF animation ========== */
export function MarqueeTicker({ maleData, femaleData, leagueData }: UnifiedMarqueeProps = {}) {
  const qc = useQueryClient();
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const lastTimeRef = useRef(0);

  const { data } = useQuery<{ items: FeedItem[] }>({
    queryKey: ['feed'],
    queryFn: async () => {
      const res = await fetch('/api/feed');
      if (!res.ok) throw new Error('Feed fetch failed');
      return res.json();
    },
    staleTime: 120000,
    refetchInterval: 300000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Pusher real-time
  useEffect(() => {
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!pusherKey || !pusherCluster) return;

    let pusher: any;
    let channel: any;

    import('pusher-js').then(({ default: PusherJS }) => {
      pusher = new PusherJS(pusherKey, { cluster: pusherCluster });
      channel = pusher.subscribe('idm-feed');
      channel.bind('feed-updated', () => {
        qc.invalidateQueries({ queryKey: ['feed'] });
      });
    }).catch(() => {});

    return () => {
      if (channel) {
        channel.unbind_all();
        channel.unsubscribe();
      }
      if (pusher) pusher.disconnect();
    };
  }, [qc]);

  // Build combined items
  const combinedItems = useMemo(() => {
    const stats: FeedItem[] = [];

    const totalPlayers = (maleData?.totalPlayers || 0) + (femaleData?.totalPlayers || 0);
    const totalPrizePool = (maleData?.activeTournamentPrizePool ?? maleData?.totalPrizePool ?? 0) + (femaleData?.activeTournamentPrizePool ?? femaleData?.totalPrizePool ?? 0);
    const totalMatches = leagueData?.stats?.totalMatches || (maleData?.recentMatches?.length || 0) + (femaleData?.recentMatches?.length || 0);
    const totalClubs = leagueData?.stats?.totalClubs || (maleData?.clubs?.length || 0) + (femaleData?.clubs?.length || 0);
    const completedMatches = leagueData?.stats?.completedMatches || 0;
    const seasonInfo = leagueData?.tarkamChampion
      ? `Season ${leagueData.tarkamChampion.seasonNumber}`
      : leagueData?.preSeason ? 'Pre-Season' : 'Season Berjalan';

    stats.push(
      { id: 'stat-players', type: 'stat', icon: '👥', title: `${totalPlayers}`, subtitle: 'Total Pemain', timestamp: new Date().toISOString(), accent: '#57B5FF', numericValue: totalPlayers },
      { id: 'stat-clubs', type: 'stat', icon: '🏛️', title: `${totalClubs}`, subtitle: 'Total Klub', timestamp: new Date().toISOString(), accent: '#EFF923', numericValue: totalClubs },
    );

    if (totalPrizePool > 0) {
      stats.push({ id: 'stat-prize', type: 'stat', icon: '💰', title: formatCurrency(totalPrizePool), subtitle: 'Hadiah', timestamp: new Date().toISOString(), accent: '#22c55e', numericValue: totalPrizePool });
    }

    if (totalMatches > 0) {
      stats.push({ id: 'stat-matches', type: 'stat', icon: '⚔️', title: `${totalMatches}`, subtitle: 'Pertandingan', timestamp: new Date().toISOString(), accent: '#FF2D78', numericValue: totalMatches });
    }

    if (completedMatches > 0 && completedMatches !== totalMatches) {
      stats.push({ id: 'stat-completed', type: 'stat', icon: '✅', title: `${completedMatches}`, subtitle: 'Selesai', timestamp: new Date().toISOString(), accent: '#22c55e', numericValue: completedMatches });
    }

    stats.push(
      { id: 'stat-season', type: 'stat', icon: '📅', title: seasonInfo, subtitle: 'Season Berjalan', timestamp: new Date().toISOString(), accent: '#f59e0b' },
    );

    const feedItems = (data?.items && data.items.length > 0) ? data.items : [];

    return [...stats, ...feedItems];
  }, [data?.items, maleData, femaleData, leagueData]);

  // Build the track with separators
  const trackContent = useMemo(() => {
    const elements: React.ReactNode[] = [];
    combinedItems.forEach((item, i) => {
      elements.push(<FeedCard key={`card-${item.id}-${i}`} item={item} />);
      if (i < combinedItems.length - 1) {
        elements.push(<Separator key={`sep-${i}`} />);
      }
    });
    return elements;
  }, [combinedItems]);

  // rAF-driven animation loop — completely bypasses CSS animation/transition conflicts
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Skip large time gaps (tab was hidden, etc.)
      if (delta < 200 && !isPausedRef.current) {
        const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
        const speed = isMobile ? MOBILE_SPEED : DESKTOP_SPEED;
        const pixelsToMove = (speed * delta) / 1000;

        offsetRef.current -= pixelsToMove;

        // Get half track width for seamless loop reset
        const halfWidth = track.scrollWidth / 2;
        if (halfWidth > 0 && Math.abs(offsetRef.current) >= halfWidth) {
          offsetRef.current += halfWidth;
        }

        track.style.transform = `translateX(${offsetRef.current}px)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [trackContent]);

  // Pause on hover (desktop only)
  const handleMouseEnter = () => { isPausedRef.current = true; };
  const handleMouseLeave = () => { isPausedRef.current = false; };

  if (combinedItems.length === 0) return null;

  return (
    <div
      className="w-full overflow-hidden relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, hsl(var(--background)), transparent)' }}
      />
      <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, hsl(var(--background)), transparent)' }}
      />

      {/* Scrolling track — 2x for seamless loop, JS-driven rAF */}
      <div
        ref={trackRef}
        className="flex items-center"
        style={{
          width: 'max-content',
          willChange: 'transform',
        }}
      >
        {trackContent}
        {trackContent}
      </div>
    </div>
  );
}
