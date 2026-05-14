'use client';

import { useQuery } from '@tanstack/react-query';
import { Heart, Gift, Trophy, Medal, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDivisionTheme } from '@/hooks/use-division-theme';
import { formatCurrency } from '@/lib/utils';
import { getSawerTier } from '@/lib/skin-utils';

/* ─── Types ─── */
interface TopDonor {
  donorName: string;
  totalAmount: number;
  donationCount: number;
  latestType: string;
  latestDate: string | null;
}

/** Enriched donor with per-division breakdown */
interface DivisionDonor {
  donorName: string;
  totalAmount: number;
  donationCount: number;
  latestType: string;
  latestDate: string | null;
  maleAmount: number;
  femaleAmount: number;
  divisions: ('male' | 'female')[];
}

interface TopDonorsData {
  donors: TopDonor[];
  summary: {
    totalAmount: number;
    totalDonors: number;
    totalDonations: number;
  };
}

interface TopDonorsWidgetProps {
  onDonate: () => void;
  /** If provided, uses weeklyTopDonors from stats (per active tournament) instead of all-time API */
  statsData?: import('@/types/stats').StatsData;
  /** Second division stats data — donors from both divisions will be merged */
  statsData2?: import('@/types/stats').StatsData;
}

/* ─── Helpers ─── */

/** Format Indonesian Rupiah — compact for widget display */
function formatRupiah(amount: number): string {
  return formatCurrency(amount);
}

/** Compact Rupiah — e.g. "10K", "150K", "1.5jt" */
function formatRupiahShort(amount: number): string {
  if (amount === 0) return 'Rp0';
  if (amount >= 1_000_000) return `Rp${(amount / 1_000_000).toFixed(1).replace('.0', '')}jt`;
  if (amount >= 100_000) return `Rp${(amount / 1000).toFixed(0)}K`;
  if (amount >= 10_000) return `Rp${(amount / 1000).toFixed(0)}K`;
  return `Rp${amount.toLocaleString('id-ID')}`;
}

/** Relative time in Indonesian */
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 30) return `${diffDays} hari lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/** Rank badge component — gold/silver/bronze for top 3 */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-sm donor-rank-badge">
        <Trophy className="w-3.5 h-3.5 text-yellow-900" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-sm donor-rank-badge">
        <Medal className="w-3.5 h-3.5 text-gray-700" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-sm donor-rank-badge">
        <Medal className="w-3.5 h-3.5 text-amber-200" />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
      {rank}
    </div>
  );
}

/** Division badge — color-coded male/female */
function DivisionBadge({ division }: { division: 'male' | 'female' }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0 rounded text-[8px] font-bold uppercase tracking-wider border ${
        division === 'male'
          ? 'bg-idm-male/10 text-idm-male-light border-idm-male/30'
          : 'bg-idm-female/10 text-idm-female-light border-idm-female/30'
      }`}
    >
      {division === 'male' ? '♂ M' : '♀ F'}
    </span>
  );
}

/* ─── Sub-components ─── */

function LoadingSkeleton() {
  return (
    <Card className="overflow-hidden relative glassmorphism-donor-card h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-lg">
              <Skeleton className="w-6 h-6 rounded-full shrink-0" />
              <Skeleton className="h-3 w-20 rounded flex-1" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyDonorsState({ onDonate }: { onDonate: () => void }) {
  const dt = useDivisionTheme();

  return (
    <Card className="overflow-hidden relative glassmorphism-donor-card h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="w-4 h-4 text-idm-gold-warm" />
          Top Saweran
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-6 text-center donor-empty-state">
          <div className="relative inline-flex items-center justify-center mb-3">
            <div className="empty-glow-ring absolute inset-0 rounded-full bg-idm-gold-warm/10" />
            <div className="empty-icon-float relative z-10">
              <Heart className="w-8 h-8 text-idm-gold-warm/40" />
            </div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground/70 mb-1">
            Belum ada penyawer
          </p>
          <p className="text-[10px] text-muted-foreground/50 mb-3">
            Jadilah yang pertama menyawer prize pool!
          </p>
          <Button
            size="sm"
            onClick={onDonate}
            className={`h-7 text-[10px] font-bold bg-gradient-to-r from-idm-gold-warm to-[#e8d5a3] text-black hover:opacity-90 transition-opacity ${dt.neonPulse}`}
          >
            <Gift className="w-3 h-3 mr-1" />
            Sawer Sekarang
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Component ─── */

export function TopDonorsWidget({ onDonate, statsData, statsData2 }: TopDonorsWidgetProps) {
  const dt = useDivisionTheme();

  // Use weeklyTopDonors from stats if provided, otherwise fall back to all-time API
  const { data, isLoading } = useQuery<TopDonorsData>({
    queryKey: ['top-donors'],
    queryFn: async () => {
      const res = await fetch('/api/donations/top-donors');
      if (!res.ok) throw new Error('Failed to fetch top donors');
      return res.json();
    },
    staleTime: 30000,
    enabled: !statsData?.weeklyTopDonors?.length && !statsData2?.weeklyTopDonors?.length,
  });

  const hasAnyWeekly = (statsData?.weeklyTopDonors?.length ?? 0) > 0 || (statsData2?.weeklyTopDonors?.length ?? 0) > 0;
  if (isLoading && !hasAnyWeekly) return <LoadingSkeleton />;

  // Merge weeklyTopDonors from both divisions — track per-division amounts
  const donorMap = new Map<string, { donorName: string; totalAmount: number; donationCount: number; maleAmount: number; femaleAmount: number }>();

  const mergeWeeklyDonors = (donors: import('@/types/stats').TopDonor[], division: 'male' | 'female') => {
    for (const d of donors) {
      const key = d.donorName.toLowerCase().trim();
      const existing = donorMap.get(key);
      if (existing) {
        donorMap.set(key, {
          donorName: d.donorName,
          totalAmount: existing.totalAmount + d.totalAmount,
          donationCount: existing.donationCount + d.donationCount,
          maleAmount: existing.maleAmount + (division === 'male' ? d.totalAmount : 0),
          femaleAmount: existing.femaleAmount + (division === 'female' ? d.totalAmount : 0),
        });
      } else {
        donorMap.set(key, {
          donorName: d.donorName,
          totalAmount: d.totalAmount,
          donationCount: d.donationCount,
          maleAmount: division === 'male' ? d.totalAmount : 0,
          femaleAmount: division === 'female' ? d.totalAmount : 0,
        });
      }
    }
  };

  // Prefer weekly-scoped donors from stats, fall back to all-time API data
  const weekly1 = statsData?.weeklyTopDonors;
  const weekly2 = statsData2?.weeklyTopDonors;
  const hasWeekly = (weekly1 && weekly1.length > 0) || (weekly2 && weekly2.length > 0);
  const apiSummary = data?.summary;

  // Determine which statsData is male/female
  const div1 = statsData?.activeTournament?.division || 'male';
  const div2 = statsData2?.activeTournament?.division || 'female';

  let donors: DivisionDonor[];

  if (hasWeekly) {
    if (weekly1?.length) mergeWeeklyDonors(weekly1, div1 as 'male' | 'female');
    if (weekly2?.length) mergeWeeklyDonors(weekly2, div2 as 'male' | 'female');
    donors = Array.from(donorMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map(d => ({
        donorName: d.donorName,
        totalAmount: d.totalAmount,
        donationCount: d.donationCount,
        latestType: 'weekly',
        latestDate: null as string | null,
        maleAmount: d.maleAmount,
        femaleAmount: d.femaleAmount,
        divisions: [
          ...(d.maleAmount > 0 ? ['male' as const] : []),
          ...(d.femaleAmount > 0 ? ['female' as const] : []),
        ],
      }));
  } else {
    donors = (data?.donors ?? []).map(d => ({
      ...d,
      maleAmount: d.totalAmount,
      femaleAmount: 0,
      divisions: ['male' as const],
    }));
  }

  const weekNum = statsData?.activeTournament?.weekNumber || statsData2?.activeTournament?.weekNumber;
  const weekLabel = hasWeekly && weekNum ? `Week ${weekNum}` : '';

  // Calculate totals per division
  const totalMale = donors.reduce((s, d) => s + d.maleAmount, 0);
  const totalFemale = donors.reduce((s, d) => s + d.femaleAmount, 0);
  const totalAmount = totalMale + totalFemale;
  const totalDonors = hasWeekly ? donors.length : (apiSummary?.totalDonors ?? 0);

  if (donors.length === 0) return <EmptyDonorsState onDonate={onDonate} />;

  return (
    <Card className="overflow-hidden relative glassmorphism-donor-card h-full flex flex-col">
      {/* Gold accent top bar */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-idm-gold-warm to-transparent opacity-60" />

      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="w-4 h-4 text-idm-gold-warm" />
            Top Saweran
            {weekLabel && <Badge className="text-[8px] px-1.5 py-0 h-4 bg-idm-gold-warm/15 text-idm-gold-warm border-0 font-semibold">{weekLabel}</Badge>}
          </CardTitle>
          {totalAmount > 0 && (
            <div className="text-right">
              <p className={`text-xs font-bold ${dt.neonGradient}`}>
                {formatRupiah(totalAmount)}
              </p>
              <p className="text-[9px] text-muted-foreground/60">
                dari {totalDonors} penyawer
              </p>
              {/* Desktop: per-division breakdown on the right under total */}
              {totalAmount > 0 && (totalMale > 0 || totalFemale > 0) && (
                <div className="hidden sm:flex items-center gap-2 mt-0.5 justify-end">
                  {totalMale > 0 && (
                    <span className="text-[9px] text-idm-male-light/80">
                      ♂ {formatRupiahShort(totalMale)}
                    </span>
                  )}
                  {totalFemale > 0 && (
                    <span className="text-[9px] text-idm-female-light/80">
                      ♀ {formatRupiahShort(totalFemale)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Mobile: per-division breakdown below title */}
        {totalAmount > 0 && (totalMale > 0 || totalFemale > 0) && (
          <div className="flex sm:hidden items-center gap-2 mt-1">
            {totalMale > 0 && (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center px-1.5 py-0 rounded text-[8px] font-bold uppercase tracking-wider border bg-idm-male/10 text-idm-male-light border-idm-male/30">
                  ♂ Male
                </span>
                <span className="text-[10px] font-semibold text-idm-male-light">
                  {formatRupiahShort(totalMale)}
                </span>
              </div>
            )}
            {totalFemale > 0 && (
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center px-1.5 py-0 rounded text-[8px] font-bold uppercase tracking-wider border bg-idm-female/10 text-idm-female-light border-idm-female/30">
                  ♀ Female
                </span>
                <span className="text-[10px] font-semibold text-idm-female-light">
                  {formatRupiahShort(totalFemale)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Donor list */}
        <div className="max-h-80 lg:max-h-64 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-1 pr-1 flex-1">
          {donors.map((donor, i) => (
            <div
              key={donor.donorName}
              className="donor-row-enter p-2.5 rounded-lg hover:bg-idm-gold-warm/5 transition-colors group"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Row 1: Rank + Name + Tier Badge + Total */}
              <div className="flex items-center gap-2">
                {/* Rank */}
                <RankBadge rank={i + 1} />

                {/* Name + badges */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className={`text-xs font-semibold truncate ${
                    i === 0
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500 animate-pulse'
                      : ''
                  }`} style={i === 0 ? { textShadow: '0 0 12px rgba(244,63,94,0.5), 0 0 24px rgba(244,63,94,0.3)' } : undefined}>
                    {donor.donorName || 'Anonymous'}
                  </span>
                  {/* Division badges */}
                  {donor.divisions.map(div => (
                    <DivisionBadge key={div} division={div} />
                  ))}
                  {/* Sawer tier badge */}
                  {(() => {
                    const sawerTier = donor.latestType === 'weekly' ? getSawerTier(donor.totalAmount) : null;
                    if (!sawerTier) return null;
                    const tierColors: Record<string, { bg: string; border: string; text: string }> = {
                      sawer_diamond: { bg: 'rgba(87,181,255,0.15)', border: 'rgba(87,181,255,0.4)', text: 'text-idm-male-light' },
                      sawer_gold: { bg: 'rgba(250,204,21,0.15)', border: 'rgba(250,204,21,0.4)', text: 'text-yellow-300' },
                      sawer_silver: { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.4)', text: 'text-muted-foreground' },
                      sawer_bronze: { bg: 'rgba(180,83,9,0.15)', border: 'rgba(180,83,9,0.4)', text: 'text-amber-400' },
                    };
                    const tc = tierColors[sawerTier] || tierColors.sawer_bronze;
                    const tierLabel = sawerTier.replace('sawer_', '').charAt(0).toUpperCase() + sawerTier.replace('sawer_', '').slice(1);
                    const tierEmoji = sawerTier === 'sawer_diamond' ? '💎' : sawerTier === 'sawer_gold' ? '🥇' : sawerTier === 'sawer_gold' ? '🥈' : '🥉';
                    return (
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 border ${tc.text}`}
                        style={{ backgroundColor: tc.bg, borderColor: tc.border }}
                        title={`Sawer ${tierLabel}`}
                      >
                        {tierEmoji} {tierLabel}
                      </span>
                    );
                  })()}
                </div>

                {/* Total amount */}
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-bold text-idm-gold-warm donor-amount">
                    {formatRupiah(donor.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Row 2: Per-division breakdown */}
              {(donor.maleAmount > 0 || donor.femaleAmount > 0) && donor.divisions.length > 0 && (
                <div className="flex items-center gap-2 mt-1 ml-8">
                  {donor.maleAmount > 0 && (
                    <span className="text-[9px] text-idm-male-light/70">
                      ♂ {formatRupiahShort(donor.maleAmount)}
                    </span>
                  )}
                  {donor.femaleAmount > 0 && (
                    <span className="text-[9px] text-idm-female-light/70">
                      ♀ {formatRupiahShort(donor.femaleAmount)}
                    </span>
                  )}
                  {donor.latestDate && (
                    <>
                      <span className="text-[9px] text-muted-foreground/30">·</span>
                      <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground/50">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(donor.latestDate)}
                      </span>
                    </>
                  )}
                  <span className="text-[9px] text-muted-foreground/40">
                    {donor.donationCount}x sawer
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA button — compact & centered */}
        <div className="mt-3 pt-2 border-t border-border/30 flex justify-center">
          <Button
            size="sm"
            onClick={onDonate}
            className={`h-7 text-[10px] font-bold bg-gradient-to-r from-idm-gold-warm to-[#e8d5a3] text-black hover:opacity-90 transition-opacity cursor-pointer ${dt.neonPulse}`}
          >
            <Gift className="w-3 h-3 mr-1" />
            Sawer Sekarang
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
