'use client';

import { useQuery } from '@tanstack/react-query';
import type { StatsData, TopPlayer, WeeklyPerformer, SeasonChampionPlayer } from '@/types/stats';
import {
  Users, Trophy, Crown,
  Radio, Star,
  Target, Calendar,
  Clock, Gift, Zap, Shield, Music, Gamepad2,
  Search, Play, CheckCircle2, XCircle,
  ChevronDown, ChevronUp,
  Flame, TrendingUp,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import React, { useState, useRef, useMemo, useEffect, useCallback, useDeferredValue, startTransition } from 'react';
import { useCommunityTheme, getCommunityTheme } from '@/hooks/use-community-theme';
import { useDivisionTheme, getDivisionTheme } from '@/hooks/use-division-theme';
import { useAppStore } from '@/lib/store';
import { formatCurrencyShort, clubToString, getAvatarUrl } from '@/lib/utils';
import { AvatarMedia } from '@/components/ui/avatar-media';
import { PlayerProfile } from '../player-profile';
import { ClubProfile } from '../club-profile';

// Import modular components — original
import { CommunityHero } from './community-hero';
import { CommunityLeaderboard, PeringkatHeader } from './community-leaderboard';
import { SultanOfWeekSection } from './community-champions';

// Import modular components — new features
import { MvpSpotlight } from './mvp-spotlight';

import { CommunityMatches } from './community-matches';
import { UpcomingMatches } from './upcoming-matches';
import { CommunityWeeklyChampions } from './weekly-champions';
import { WeeklyChampionCard } from './weekly-champion-card';
import { PlayerCard } from '../player-card';
import { WeekNavigator } from '../week-navigator';
import { DonationModal } from '../donation-modal';
import { RegistrationModal } from '../registration-modal';
import { PaymentModal } from '../payment-modal';

// Import division dashboard components — REUSE, do NOT duplicate
import { QuickStatsBar } from '../dashboard/quick-stats-bar';
import { TopDonorsWidget } from '../dashboard/top-donors-widget';

import { MvpHallOfFame } from './mvp-hall-of-fame';
import { MatchesTab } from '../dashboard/matches-tab';

// Import shared components
import { SkinBadgesRow, SkinName } from '../skin-renderer';
import { getPrimarySkin } from '@/lib/skin-utils';
import { StatusBadge } from '../status-badge';
import { ShareButton } from '../ui/share-button';
import { SponsorBanner } from '../ui/sponsor-banner';

// Import season selector components
import { SeasonSelector, type SelectedSeason } from './season-selector';
import { HistoricalSeasonView } from './historical-season-view';

// Import marquee ticker
import { MarqueeTicker } from '../marquee-ticker';

// Pusher real-time hook is already called in AppShell — no duplicate needed here

// Import landing shared components for visual enhancements
import { AnimatedSection } from '../landing/shared';

// Import dashboard shared components for bracket-style hasil section
import { SectionCard, MatchRow } from '../dashboard/shared';

// Import SharePopup for social sharing
import { SharePopup } from '../social-share-button';


/* ═══════════════════════════════════════════
   Internal Tab Bar — reusable within sections
   Desktop: Segmented control with larger targets
   Mobile: Horizontal scroll, no wrapping
   ═══════════════════════════════════════════ */
const SectionTabBar = React.memo(function SectionTabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { id: T; label: string; icon?: typeof Trophy }[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}) {
  return (
    <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
      <div className="flex items-center gap-0.5 p-1 rounded-lg bg-idm-gold-warm/5 border border-idm-gold-warm/10 min-w-max lg:min-w-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap lg:px-4 lg:py-2 lg:text-xs ${
                isActive
                  ? 'bg-idm-gold-warm/20 text-idm-gold-warm shadow-sm border border-idm-gold-warm/25 activity-card-glass'
                  : 'text-muted-foreground hover:text-foreground border border-transparent hover:bg-muted/40'
              }`}
            >
              {Icon && <Icon className="w-3 h-3 lg:w-3.5 lg:h-3.5" />}
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});


/* ═══════════════════════════════════════════
   Tournament Progress Steps — ported from dashboard
   ═══════════════════════════════════════════ */
const TournamentProgress = React.memo(function TournamentProgress({ status, divisionTheme }: { status: string; divisionTheme: ReturnType<typeof getDivisionTheme> }) {
  const dt = divisionTheme;
  const steps = [
    { key: 'setup', label: 'Setup' },
    { key: 'registration', label: 'Daftar' },
    { key: 'approval', label: 'Approval' },
    { key: 'team_generation', label: 'Tim' },
    { key: 'bracket_generation', label: 'Bracket' },
    { key: 'main_event', label: 'Main' },
    { key: 'finalization', label: 'Final' },
    { key: 'completed', label: 'Selesai' },
  ];
  const currentIdx = steps.findIndex(s => s.key === status);

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-1 scrollbar-none">
      {steps.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold whitespace-nowrap ${
              isDone ? `${dt.bgSubtle} ${dt.neonText}` :
              isCurrent ? `${dt.bg} ${dt.text} ${dt.neonPulse}` :
              'bg-muted/30 text-muted-foreground/50'
            }`}>
              {isDone ? <CheckCircle2 className="w-2.5 h-2.5" /> :
               isCurrent ? <Play className="w-2.5 h-2.5" /> :
               <div className="w-2.5 h-2.5 rounded-full border border-current opacity-30" />}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-2 h-0.5 ${isDone ? dt.neonText : 'bg-muted/30'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
});


/* ═══════════════════════════════════════════
   Round Label Helper
   ═══════════════════════════════════════════ */
function getRoundLabelFromTotal(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'Grand Final';
  if (fromEnd === 1) return 'Semi Final';
  if (fromEnd === 2) return 'Quarter Final';
  return `Ronde ${round}`;
}

type DivisionFilter = 'all' | 'male' | 'female';


/* ═══════════════════════════════════════════
   Champion Section — Vertical Stack:
   Reigning Champion Plaque → Weekly Champions → MVP Spotlight → Top Form → Streaks
   All visible, zero clicks. Division filter kept as pill selector.
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   Champion Header — Sticky heading with division filter tabs
   Extracted so it can be made sticky across sections
   ═══════════════════════════════════════════ */
const ChampionsMvpHeader = React.memo(function ChampionsMvpHeader({
  selectedDivision,
  onDivisionChange,
}: {
  selectedDivision: DivisionFilter;
  onDivisionChange: (d: DivisionFilter) => void;
}) {
  const ct = useCommunityTheme();

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-5 h-5 rounded ${ct.iconBg} flex items-center justify-center shrink-0`}>
          <Crown className={`w-3 h-3 ${ct.neonText}`} />
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-wider shrink-0" style={{
          background: 'linear-gradient(135deg, #FAF0DC 0%, #EFF923 30%, #F9CB25 50%, #F9CB25 70%, #EFF923 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>Champion</h3>
      </div>

      {/* Division pills — compact, right-aligned */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-idm-gold-warm/5 border border-idm-gold-warm/10">
        {([
          { key: 'all' as DivisionFilter, label: 'Semua' },
          { key: 'male' as DivisionFilter, label: 'Cowo' },
          { key: 'female' as DivisionFilter, label: 'Cewe' },
        ]).map(div => (
          <button
            key={div.key}
            onClick={() => onDivisionChange(div.key)}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedDivision === div.key
                ? 'bg-idm-gold-warm/15 text-idm-gold-warm shadow-sm shadow-idm-gold-warm/10 border border-idm-gold-warm/25'
                : 'text-muted-foreground/70 hover:text-foreground border border-transparent hover:bg-muted/40'
            }`}
          >
            {div.label}
          </button>
        ))}
      </div>
    </div>
  );
});


/* ═══════════════════════════════════════════
   Champion Content — Cards below the sticky header
   ═══════════════════════════════════════════ */
const ChampionsMvpContent = React.memo(function ChampionsMvpContent({
  maleData,
  femaleData,
  selectedDivision,
  onPlayerClick,
}: {
  maleData?: StatsData;
  femaleData?: StatsData;
  selectedDivision: DivisionFilter;
  onPlayerClick: (player: TopPlayer & { division?: string }, division: 'male' | 'female') => void;
}) {
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ═══ 0. Reigning Champion Plaque — Compact trophy badge ═══ */}
      <ReigningChampionPlaque
        maleData={maleData}
        femaleData={femaleData}
        selectedDivision={selectedDivision}
        onPlayerClick={onPlayerClick}
      />

      {/* ═══ 1. Weekly Champions — Hero position, biggest visual weight ═══ */}
      <div className="animate-fade-enter-sm">
        <WeeklyChampionCard maleData={maleData} femaleData={femaleData} selectedDivision={selectedDivision} onPlayerClick={onPlayerClick} />
      </div>

      {/* ═══ 2. MVP Spotlight — Featured card, secondary weight ═══ */}
      <div className="animate-fade-enter-sm">
        <MvpSpotlight maleData={maleData} femaleData={femaleData} selectedDivision={selectedDivision} onPlayerClick={onPlayerClick} />
      </div>

      {/* ═══ 3. Sultan of the Week — Top penyawer per tournament ═══ */}
      <div className="animate-fade-enter-sm">
        <div className={`grid gap-4 ${selectedDivision === 'all' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {(selectedDivision === 'all' || selectedDivision === 'male') && (
            <SultanOfWeekSection
              division="male"
              sultanData={maleData?.sultanOfWeekly}
              skinMap={maleData?.skinMap || {}}
              onPlayerClick={onPlayerClick}
            />
          )}
          {(selectedDivision === 'all' || selectedDivision === 'female') && (
            <SultanOfWeekSection
              division="female"
              sultanData={femaleData?.sultanOfWeekly}
              skinMap={femaleData?.skinMap || {}}
              onPlayerClick={onPlayerClick}
            />
          )}
        </div>
      </div>

      {/* ═══ 4. MVP Hall of Fame — All MVPs per week ═══ */}
      <div className="animate-fade-enter-sm">
        <MvpHallOfFame maleData={maleData} femaleData={femaleData} selectedDivision={selectedDivision} />
      </div>
    </div>
  );
});


/* ═══════════════════════════════════════════
   Reigning Champion Plaque — Compact trophy badge
   Shows the most recent completed season's champions.
   "Reigning Champion" = juara bertahan, the one to beat this season.
   When 'all' selected → male + female side by side.
   When specific division → just that division's champion.
   ═══════════════════════════════════════════ */

const ReigningChampionPlaque = React.memo(function ReigningChampionPlaque({
  maleData,
  femaleData,
  selectedDivision,
  onPlayerClick,
}: {
  maleData?: StatsData;
  femaleData?: StatsData;
  selectedDivision: DivisionFilter;
  onPlayerClick: (player: TopPlayer & { division?: string }, division: 'male' | 'female') => void;
}) {
  const ct = useCommunityTheme();

  // Extract most recent completed season champion per division
  const completedMaleSeasons = maleData?.allSeasons?.filter(s => s.status === 'completed' && s.championPlayer) || [];
  const completedFemaleSeasons = femaleData?.allSeasons?.filter(s => s.status === 'completed' && s.championPlayer) || [];

  // Sort descending by season number, take first = most recent
  const latestMale = completedMaleSeasons.sort((a, b) => b.number - a.number)[0];
  const latestFemale = completedFemaleSeasons.sort((a, b) => b.number - a.number)[0];

  const hasMale = !!latestMale?.championPlayer;
  const hasFemale = !!latestFemale?.championPlayer;
  const showMale = selectedDivision === 'all' || selectedDivision === 'male';
  const showFemale = selectedDivision === 'all' || selectedDivision === 'female';

  // Determine which season label to show
  const seasonNumber = hasMale && hasFemale
    ? Math.max(latestMale.number, latestFemale.number)
    : hasMale ? latestMale.number : hasFemale ? latestFemale.number : 0;

  // Determine grid layout
  const showBothDivisions = showMale && showFemale;
  const bothFilled = hasMale && hasFemale;

  return (
    <div className="animate-fade-enter-sm">
      <div className={`rounded-2xl ${ct.casinoCard} overflow-hidden`}>
        <div className={ct.casinoBar} />

        {/* Header — "Reigning Champion" with season badge */}
        <div className={`flex items-center gap-2.5 px-3 lg:px-5 py-2.5 border-b ${ct.borderSubtle}`}>
          <div className={`w-5 h-5 rounded ${ct.iconBg} flex items-center justify-center shrink-0`}>
            <Crown className={`w-3 h-3 ${ct.neonText}`} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-idm-gold-warm">Reigning Champion</span>
          <SharePopup
            shareUrl={typeof window !== 'undefined' ? `${window.location.origin}/?view=champion` : ''}
            title="Bagikan Juara"
            subtitle="Reigning Champion"
            shareText="Lihat juara Tarkam IDM!"
            buttonLabel="Bagikan juara"
            size="sm"
          />
          {seasonNumber > 0 ? (
            <Badge className="bg-idm-gold-warm/15 text-idm-gold-warm border border-idm-gold-warm/25 ml-auto text-[9px] font-bold">
              <Crown className="w-2.5 h-2.5 mr-0.5" />S{seasonNumber}
            </Badge>
          ) : (
            <Badge className="bg-muted/20 text-muted-foreground/40 border border-border/10 ml-auto text-[9px] font-bold">
              TBA
            </Badge>
          )}
        </div>

        {/* Plaque Content — duo or single */}
        <div className="p-3 sm:p-6">
          <div className={`grid gap-3 ${showBothDivisions ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Male Champion — filled or ghost */}
            {showMale && (
              hasMale && latestMale?.championPlayer ? (
                <ChampionBadge
                  champion={latestMale.championPlayer}
                  seasonNumber={latestMale.number}
                  division="male"
                  onClick={() => onPlayerClick({
                    ...latestMale.championPlayer!,
                    name: latestMale.championPlayer!.gamertag,
                    club: latestMale.championPlayer!.club ?? undefined,
                    division: 'male',
                  }, 'male')}
                />
              ) : (
                <GhostChampionBadge division="male" />
              )
            )}

            {/* Female Champion — filled or ghost */}
            {showFemale && (
              hasFemale && latestFemale?.championPlayer ? (
                <ChampionBadge
                  champion={latestFemale.championPlayer}
                  seasonNumber={latestFemale.number}
                  division="female"
                  onClick={() => onPlayerClick({
                    ...latestFemale.championPlayer!,
                    name: latestFemale.championPlayer!.gamertag,
                    club: latestFemale.championPlayer!.club ?? undefined,
                    division: 'female',
                  }, 'female')}
                />
              ) : (
                <GhostChampionBadge division="female" />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
});


/* ─── Champion Badge — Single champion compact plaque ─── */
const ChampionBadge = React.memo(function ChampionBadge({
  champion,
  seasonNumber,
  division,
  onClick,
}: {
  champion: SeasonChampionPlayer;
  seasonNumber: number;
  division: 'male' | 'female';
  onClick: () => void;
}) {
  const dt = getDivisionTheme(division);
  const avatarUrl = getAvatarUrl(champion.gamertag, division, champion.avatar);
  const divisionIcon = division === 'male' ? Music : Shield;
  const DivisionIcon = divisionIcon;
  const genderSymbol = division === 'male' ? '♂' : '♀';
  const accentColor = division === 'male' ? '#2E9FFF' : '#FF2D78';

  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-3 p-4 sm:p-5 rounded-2xl border ${dt.bgSubtle} ${dt.borderSubtle} hover:${dt.border} transition-all cursor-pointer text-left w-full`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-2xl overflow-hidden border-2 shadow-lg" style={{ borderColor: accentColor + '40' }}>
          <AvatarMedia src={avatarUrl} alt={champion.gamertag} width={48} height={48} className="w-full h-full object-cover" />
        </div>
        {/* Crown overlay */}
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg border border-yellow-400/30">
          <Crown className="w-2.5 h-2.5 text-white" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <DivisionIcon className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>
            {division === 'male' ? 'COWO' : 'CEWE'} {genderSymbol}
          </span>
        </div>
        <p className="text-sm font-bold truncate text-foreground group-hover:text-idm-gold-warm transition-colors">
          {champion.gamertag}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          
          <span className="text-[10px] font-bold text-idm-gold-warm tabular-nums">{champion.points}pts</span>
          <span className="text-[10px] text-muted-foreground/70">{champion.totalWins}W</span>
        </div>
      </div>

      {/* Arrow hint */}
      <ChevronDown className="w-4 h-4 text-muted-foreground/30 -rotate-90 shrink-0 group-hover:text-idm-gold-warm/60 transition-colors" />
    </button>
  );
});


/* ─── Ghost Champion Badge — Empty state matching ChampionBadge layout ─── */
const GhostChampionBadge = React.memo(function GhostChampionBadge({ division }: { division: 'male' | 'female' }) {
  const dt = getDivisionTheme(division);
  const DivisionIcon = division === 'male' ? Music : Shield;
  const genderSymbol = division === 'male' ? '♂' : '♀';
  const accentColor = division === 'male' ? '#2E9FFF' : '#FF2D78';

  return (
    <div className={`flex items-center gap-3 p-4 sm:p-5 rounded-2xl border ${dt.bgSubtle} ${dt.borderSubtle} opacity-55`}>
      {/* Ghost avatar */}
      <div className="relative shrink-0">
        <div
          className="w-11 h-11 lg:w-12 lg:h-12 rounded-2xl overflow-hidden border-2 flex items-center justify-center"
          style={{ borderColor: accentColor + '25', background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)` }}
        >
          <Crown className="w-4 h-4 opacity-40" style={{ color: accentColor }} />
        </div>
      </div>

      {/* Ghost info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <DivisionIcon className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>
            {division === 'male' ? 'COWO' : 'CEWE'} {genderSymbol}
          </span>
        </div>
        <div className="h-4 w-20 rounded bg-muted/35 mb-1.5" />
        <div className="flex items-center gap-2">
          <div className="h-3 w-8 rounded bg-muted/25" />
          <div className="h-3 w-10 rounded bg-muted/25" />
        </div>
      </div>
    </div>
  );
});


/* ═══════════════════════════════════════════
   Compact Cards — 3-column PlayerCard for side-by-side row
   ═══════════════════════════════════════════ */

/* ─── Compact Weekly Champion Card ─── */
const CompactWeeklyChampionCard = React.memo(function CompactWeeklyChampionCard({
  division,
  data,
}: {
  division: 'male' | 'female';
  data?: StatsData;
}) {
  const dt = getDivisionTheme(division);
  const emoji = division === 'male' ? '🕺' : '💃';
  const champions = data?.weeklyChampions || [];
  const totalWeeks = data?.seasonProgress?.totalWeeks || 10;

  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    const completedWeeks = champions.map(c => c.weekNumber);
    return completedWeeks.length > 0 ? completedWeeks[completedWeeks.length - 1] : 1;
  });

  const selectedChampion = champions.find(c => c.weekNumber === selectedWeek) || champions[champions.length - 1] || null;
  const winnerTeam = selectedChampion?.winnerTeam;
  const championPlayers = winnerTeam?.players || [];
  const completedWeeks = champions.map(c => c.weekNumber);

  return (
    <Card className={`${dt.casinoCard} overflow-hidden relative h-full flex flex-col`}>
      <div className={dt.casinoBar} />
      <div className={`hidden lg:block absolute top-8 right-8 w-32 h-32 rounded-full blur-3xl ${dt.bg} opacity-20 pointer-events-none`} />

      {/* Header */}
      <div className={`flex items-center gap-2.5 px-3 lg:px-6 py-3 border-b ${dt.borderSubtle}`}>
        <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded ${dt.iconBg} flex items-center justify-center shrink-0`}>
          <Trophy className={`w-3 h-3 lg:w-3.5 lg:h-3.5 ${dt.neonText}`} />
        </div>
        <h3 className="text-xs lg:text-sm font-semibold uppercase tracking-wider truncate">
          {emoji} Juara Tarkam
        </h3>
        {champions.length > 0 && (
          <Badge className={`hidden sm:inline-flex ${dt.casinoBadge} ml-auto text-[9px]`}>
            W{selectedChampion?.weekNumber}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6 flex-1 flex flex-col">
        {champions.length === 0 ? (
          <div className={`flex-1 flex items-center justify-center p-8 rounded-2xl ${dt.bgSubtle} ${dt.border}`}>
            <div className="text-center">
              <Trophy className={`w-10 h-10 mx-auto mb-3 opacity-20 ${dt.text}`} />
              <p className="text-sm font-semibold text-muted-foreground/80 mb-1">Belum Ada Juara Tarkam</p>
              <p className="text-xs text-muted-foreground/50">Juara weekly akan muncul setelah turnamen selesai</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex-1">
            {/* Team banner */}
            <div className={`flex items-center gap-3 p-4 sm:p-5 rounded-2xl ${dt.bgSubtle} ${dt.border}`}>
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shrink-0`}>
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-yellow-400 truncate">{winnerTeam?.name || 'TBD'}</p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedChampion ? `Week ${selectedChampion.weekNumber} Champion` : 'Belum ada pemenang'}
                </p>
              </div>
              <Badge className="bg-yellow-500/15 text-yellow-500 border-0 text-[9px] shrink-0">🏆 JUARA</Badge>
            </div>

            {/* Player Cards — 3-column grid */}
            {championPlayers.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {championPlayers.slice(0, 3).map((p, idx) => (
                  <div key={p.id} className="relative">
                    {selectedChampion?.mvp?.id === p.id && (
                      <div className="absolute top-1 left-1 z-20">
                        <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <Star className="w-3 h-3 text-yellow-400" />
                        </div>
                      </div>
                    )}
                    <PlayerCard
                      gamertag={p.gamertag}
                      avatar={p.avatar}
                      points={p.points}
                      totalWins={p.totalWins}
                      totalMvp={p.totalMvp}
                      streak={p.streak}
                      rank={idx + 1}
                      isMvp={selectedChampion?.mvp?.id === p.id}
                      club={winnerTeam?.name}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className={`p-6 rounded-2xl ${dt.bgSubtle} ${dt.border} text-center`}>
                <p className="text-sm text-muted-foreground">Belum ada data week ini</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Week Navigator */}
      {champions.length > 0 && (
        <div className="px-3 pb-3 lg:px-6 lg:pb-6">
          <WeekNavigator
            totalWeeks={totalWeeks}
            completedWeeks={completedWeeks}
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
            accent={division === 'male' ? '#2E9FFF' : '#FF2D78'}
            accentLight={division === 'male' ? '#57B5FF' : '#FF5C9A'}
            size="xs"
          />
        </div>
      )}
    </Card>
  );
});


/* ─── Compact MVP Card ─── */
const CompactMvpCard = React.memo(function CompactMvpCard({
  division,
  data,
  onPlayerClick,
}: {
  division: 'male' | 'female';
  data?: StatsData;
  onPlayerClick: (player: TopPlayer & { division?: string }, division: 'male' | 'female') => void;
}) {
  const dt = getDivisionTheme(division);
  const emoji = division === 'male' ? '🕺' : '💃';

  const mvpEntry = data?.mvpHallOfFame?.[0];
  const topPlayer = data?.topPlayers?.[0];

  const featuredPlayer: (TopPlayer & { division?: string }) | null = mvpEntry
    ? {
        id: mvpEntry.id,
        name: mvpEntry.gamertag,
        gamertag: mvpEntry.gamertag,
        avatar: mvpEntry.avatar,
        tier: mvpEntry.tier,
        points: mvpEntry.points,
        totalWins: mvpEntry.totalWins,
        streak: mvpEntry.streak,
        maxStreak: mvpEntry.streak,
        totalMvp: mvpEntry.totalMvp,
        matches: mvpEntry.matches || 0,
        division,
      }
    : topPlayer
      ? { ...topPlayer, division }
      : null;

  const clubName = featuredPlayer
    ? clubToString(('club' in featuredPlayer ? featuredPlayer.club : undefined) as Parameters<typeof clubToString>[0])
    : '';

  return (
    <Card className={`${dt.casinoCard} overflow-hidden relative h-full flex flex-col`}>
      <div className={dt.casinoBar} />
      <div className={`hidden lg:block absolute top-8 right-8 w-32 h-32 rounded-full blur-3xl ${dt.bg} opacity-20 pointer-events-none`} />

      {/* Header */}
      <div className={`flex items-center gap-2.5 px-3 lg:px-6 py-3 border-b ${dt.borderSubtle}`}>
        <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded ${dt.iconBg} flex items-center justify-center shrink-0`}>
          <Star className={`w-3 h-3 lg:w-3.5 lg:h-3.5 ${dt.neonText}`} />
        </div>
        <h3 className="text-xs lg:text-sm font-semibold uppercase tracking-wider truncate">
          {emoji} MVP
        </h3>
        {featuredPlayer && (
          <Badge className={`hidden sm:inline-flex ${dt.casinoBadge} ml-auto text-[9px]`}>MVP SPOTLIGHT</Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6 flex-1 flex flex-col">
        {!featuredPlayer ? (
          <div className={`flex-1 flex items-center justify-center p-8 rounded-2xl ${dt.bgSubtle} ${dt.border}`}>
            <div className="text-center">
              <Star className={`w-10 h-10 mx-auto mb-3 opacity-20 ${dt.text}`} />
              <p className="text-sm font-semibold text-muted-foreground/80 mb-1">Belum Ada MVP</p>
              <p className="text-xs text-muted-foreground/50">Pemain terbaik akan muncul di sini</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {/* PlayerCard — featured MVP (shorter ratio) */}
            <PlayerCard
              gamertag={featuredPlayer.gamertag}
              avatar={featuredPlayer.avatar}
              points={featuredPlayer.points}
              totalWins={featuredPlayer.totalWins}
              totalMvp={featuredPlayer.totalMvp}
              streak={featuredPlayer.streak}
              rank={1}
              isMvp={true}
              aspectRatio="4/3"
              club={clubName ? { id: '', name: clubName } : undefined}
              onClick={() => onPlayerClick(featuredPlayer, division)}
            />

            {/* Key Stats — 2x2 grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${dt.bgSubtle} border ${dt.borderSubtle}`}>
                <Trophy className="w-3 h-3 text-idm-gold-warm shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black tabular-nums text-idm-gold-warm leading-tight">{featuredPlayer.points}</p>
                  <p className="text-[7px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Pts</p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${dt.bgSubtle} border ${dt.borderSubtle}`}>
                <Crown className="w-3 h-3 text-green-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black tabular-nums text-green-400 leading-tight">{featuredPlayer.totalWins}</p>
                  <p className="text-[7px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Win</p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${dt.bgSubtle} border ${dt.borderSubtle}`}>
                <Star className="w-3 h-3 text-yellow-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black tabular-nums text-yellow-400 leading-tight">{featuredPlayer.totalMvp}</p>
                  <p className="text-[7px] text-muted-foreground/60 uppercase tracking-wider font-semibold">MVP</p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${dt.bgSubtle} border ${dt.borderSubtle}`}>
                <Zap className="w-3 h-3 text-orange-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black tabular-nums text-orange-400 leading-tight">{featuredPlayer.streak}</p>
                  <p className="text-[7px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Streak</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => onPlayerClick(featuredPlayer, division)}
              className={`w-full py-1.5 rounded-lg bg-gradient-to-r ${
                division === 'male'
                  ? 'from-idm-male/20 to-idm-male-light/10 border-idm-male/20'
                  : 'from-idm-female/20 to-idm-female-light/10 border-idm-female/20'
              } border text-[9px] font-bold ${dt.text} hover:brightness-110 transition-all flex items-center justify-center gap-1 cursor-pointer`}
            >
              <Zap className="w-2.5 h-2.5" />
              Lihat Profil
            </button>
          </div>
        )}
      </div>
    </Card>
  );
});


/* ─── Compact Top Form Card ─── */
const CompactTopFormCard = React.memo(function CompactTopFormCard({
  division,
  performer,
  onPlayerClick,
}: {
  division: 'male' | 'female';
  performer: WeeklyPerformer | undefined;
  onPlayerClick: (player: TopPlayer & { division?: string }, division: 'male' | 'female') => void;
}) {
  const dt = getDivisionTheme(division);
  const emoji = division === 'male' ? '🕺' : '💃';

  return (
    <Card className={`${dt.casinoCard} overflow-hidden relative h-full flex flex-col`}>
      <div className={dt.casinoBar} />
      <div className={`hidden lg:block absolute top-8 right-8 w-32 h-32 rounded-full blur-3xl ${dt.bg} opacity-20 pointer-events-none`} />

      {/* Header */}
      <div className={`flex items-center gap-2.5 px-3 lg:px-6 py-3 border-b ${dt.borderSubtle}`}>
        <div className="w-5 h-5 lg:w-6 lg:h-6 rounded bg-amber-500/15 flex items-center justify-center shrink-0">
          <TrendingUp className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-amber-400" />
        </div>
        <h3 className="text-xs lg:text-sm font-semibold uppercase tracking-wider truncate">
          {emoji} Top Perform
        </h3>
        {performer && (
          <Badge className="hidden sm:inline-flex bg-amber-500/15 text-amber-500 border-0 ml-auto text-[9px]">🔥 MINGGU INI</Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6 flex-1 flex flex-col">
        {!performer ? (
          <div className={`flex-1 flex items-center justify-center p-8 rounded-2xl ${dt.bgSubtle} ${dt.border}`}>
            <div className="text-center">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20 text-amber-500" />
              <p className="text-sm font-semibold text-muted-foreground/80 mb-1">Belum Ada Top Perform</p>
              <p className="text-xs text-muted-foreground/50">Pemain dengan performa terbaik minggu ini akan muncul di sini</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {/* PlayerCard — featured performer (shorter ratio) */}
            <PlayerCard
              gamertag={performer.gamertag}
              avatar={performer.avatar}
              points={performer.points}
              totalWins={performer.weeklyWins}
              totalMvp={0}
              streak={performer.streak}
              rank={1}
              aspectRatio="4/3"
              club={performer.club ? { id: '', name: performer.club } : undefined}
              onClick={() => onPlayerClick({
                ...performer,
                name: performer.gamertag,
                totalWins: 0,    // will be enriched from API
                totalMvp: 0,
                maxStreak: 0,    // will be enriched from API
                matches: 0,      // will be enriched from API (avoid weekly stats as totals)
                division,
              } as TopPlayer & { division?: string }, division)}
            />

            {/* Composite Score + breakdown */}
            <div className={`p-4 sm:p-5 rounded-2xl ${dt.bgSubtle} ${dt.border}`}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-black text-amber-400">{performer.compositeScore}</span>
                <span className="text-[9px] text-muted-foreground/50">COMPOSITE</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className={`p-3 sm:p-4 rounded-lg ${dt.bgSubtle} ${dt.borderSubtle} text-center`}>
                  <p className={`text-xs font-bold ${dt.neonText}`}>+{performer.weeklyPointsGained}</p>
                  <p className="text-[8px] text-muted-foreground/50">+Pts</p>
                </div>
                <div className={`p-3 sm:p-4 rounded-lg ${dt.bgSubtle} ${dt.borderSubtle} text-center`}>
                  <p className={`text-xs font-bold ${dt.neonText}`}>{performer.weeklyWinRate}%</p>
                  <p className="text-[8px] text-muted-foreground/50">Win%</p>
                </div>
                <div className={`p-3 sm:p-4 rounded-lg ${dt.bgSubtle} ${dt.borderSubtle} text-center`}>
                  <div className="flex items-center justify-center gap-0.5">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <p className={`text-xs font-bold ${dt.neonText}`}>{performer.streak}</p>
                  </div>
                  <p className="text-[8px] text-muted-foreground/50">Streak</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});


/* ═══════════════════════════════════════════
   Hasil Pertandingan Section — Bracket-style match results
   Cloned from Arena Live > Bracket > Hasil tab
   Shows completed matches grouped by round/bracket per division
   Uses BOTH LeagueMatch (recentMatches) AND Tournament matches (activeTournament.matches)
   With Semua/Male/Female tabs
   ═══════════════════════════════════════════ */

/* Unified match row type for display */
interface UnifiedMatchResult {
  id: string;
  name1: string;
  name2: string;
  score1: number | null;
  score2: number | null;
  round: number;
  bracket: string | null; // 'upper' | 'lower' | 'grand_final' | null (league matches)
  matchNumber: number | null;
  source: 'league' | 'tournament';
}

/* Get human-readable label for a bracket+round combination */
function getRoundLabel(bracket: string | null, round: number): string {
  if (!bracket) return `Round ${round}`;
  switch (bracket) {
    case 'grand_final':
      return '🏆 Grand Final';
    case 'upper':
      if (round === 1) return '⬆️ Semi Final Upper';
      if (round === 2) return '⬆️ Final Upper';
      return `⬆️ Upper R${round}`;
    case 'lower':
      if (round === 1) return '⬇️ Semi Final Lower';
      if (round === 2) return '⬇️ Final Lower';
      return `⬇️ Lower R${round}`;
    case 'winners':
      return `🏆 Winners R${round}`;
    case 'losers':
      return `💀 Losers R${round}`;
    default:
      return `Round ${round}`;
  }
}

/* Sort key for bracket+round (determines display order) */
function getRoundSortKey(bracket: string | null, round: number): number {
  if (!bracket) return round * 10;
  // Order: upper rounds → lower rounds → grand final
  switch (bracket) {
    case 'upper': return round * 10;
    case 'lower': return 100 + round * 10;
    case 'grand_final': return 999;
    case 'winners': return round * 10;
    case 'losers': return 100 + round * 10;
    default: return 500 + round * 10;
  }
}

/* Group key combining bracket and round */
function getGroupKey(m: UnifiedMatchResult): string {
  return m.bracket ? `${m.bracket}-${m.round}` : `round-${m.round}`;
}

const BracketHasilSection = React.memo(function BracketHasilSection({
  maleData,
  femaleData,
}: {
  maleData?: StatsData;
  femaleData?: StatsData;
}) {
  const ct = useCommunityTheme();
  const [hasilDivision, setHasilDivision] = useState<DivisionFilter>('all');

  // Merge LeagueMatch + Tournament matches into unified format per division
  const maleMatches = useMemo<UnifiedMatchResult[]>(() => {
    const results: UnifiedMatchResult[] = [];
    // 1. League matches (recentMatches — club-vs-club)
    for (const m of (maleData?.recentMatches ?? [])) {
      results.push({
        id: m.id,
        name1: m.club1.name,
        name2: m.club2.name,
        score1: m.score1,
        score2: m.score2,
        round: m.week,
        bracket: null,
        matchNumber: null,
        source: 'league',
      });
    }
    // 2. Tournament matches (activeTournament.matches — team-vs-team)
    const tMatches = maleData?.activeTournament?.matches?.filter(m => m.status === 'completed') ?? [];
    for (const m of tMatches) {
      results.push({
        id: m.id,
        name1: m.team1?.name ?? 'TBD',
        name2: m.team2?.name ?? 'TBD',
        score1: m.score1,
        score2: m.score2,
        round: m.round ?? 1,
        bracket: m.bracket ?? null,
        matchNumber: m.matchNumber ?? null,
        source: 'tournament',
      });
    }
    return results;
  }, [maleData?.recentMatches, maleData?.activeTournament?.matches]);

  const femaleMatches = useMemo<UnifiedMatchResult[]>(() => {
    const results: UnifiedMatchResult[] = [];
    // 1. League matches
    for (const m of (femaleData?.recentMatches ?? [])) {
      results.push({
        id: m.id,
        name1: m.club1.name,
        name2: m.club2.name,
        score1: m.score1,
        score2: m.score2,
        round: m.week,
        bracket: null,
        matchNumber: null,
        source: 'league',
      });
    }
    // 2. Tournament matches
    const tMatches = femaleData?.activeTournament?.matches?.filter(m => m.status === 'completed') ?? [];
    for (const m of tMatches) {
      results.push({
        id: m.id,
        name1: m.team1?.name ?? 'TBD',
        name2: m.team2?.name ?? 'TBD',
        score1: m.score1,
        score2: m.score2,
        round: m.round ?? 1,
        bracket: m.bracket ?? null,
        matchNumber: m.matchNumber ?? null,
        source: 'tournament',
      });
    }
    return results;
  }, [femaleData?.recentMatches, femaleData?.activeTournament?.matches]);

  // Group matches by round/bracket per division
  const maleMatchesGrouped = useMemo(() => {
    const map: Record<string, UnifiedMatchResult[]> = {};
    for (const m of maleMatches) {
      const key = getGroupKey(m);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    // Sort each group by matchNumber
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));
    }
    return map;
  }, [maleMatches]);

  const femaleMatchesGrouped = useMemo(() => {
    const map: Record<string, UnifiedMatchResult[]> = {};
    for (const m of femaleMatches) {
      const key = getGroupKey(m);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0));
    }
    return map;
  }, [femaleMatches]);

  // Sort group keys by round order (upper → lower → grand final)
  const sortGroupKeys = (keys: string[], matches: Record<string, UnifiedMatchResult[]>): string[] => {
    return keys.sort((a, b) => {
      const mA = matches[a]?.[0];
      const mB = matches[b]?.[0];
      if (!mA || !mB) return 0;
      return getRoundSortKey(mA.bracket, mA.round) - getRoundSortKey(mB.bracket, mB.round);
    });
  };

  const hasMaleMatches = maleMatches.length > 0;
  const hasFemaleMatches = femaleMatches.length > 0;
  const hasAnyMatches = hasMaleMatches || hasFemaleMatches;

  return (
    <div className="space-y-4">
      {/* Section Header + Division Tabs */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-5 h-5 rounded ${ct.iconBg} flex items-center justify-center shrink-0`}>
            <Radio className={`w-3 h-3 ${ct.neonText}`} />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-wider shrink-0" style={{
            background: 'linear-gradient(135deg, #FAF0DC 0%, #EFF923 30%, #F9CB25 50%, #F9CB25 70%, #EFF923 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Hasil Pertandingan</h3>
          <SharePopup
            shareUrl={typeof window !== 'undefined' ? `${window.location.origin}/?view=hasil` : ''}
            title="Bagikan Hasil"
            subtitle="Hasil Pertandingan"
            shareText="Lihat hasil pertandingan Tarkam IDM!"
            buttonLabel="Bagikan hasil"
            size="sm"
          />
        </div>

        {/* Division pills — compact, right-aligned (same style as Champion) */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-idm-gold-warm/5 border border-idm-gold-warm/10">
          {([
            { key: 'all' as DivisionFilter, label: 'Semua' },
            { key: 'male' as DivisionFilter, label: 'Cowo' },
            { key: 'female' as DivisionFilter, label: 'Cewe' },
          ]).map(div => (
            <button
              key={div.key}
              onClick={() => setHasilDivision(div.key)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                hasilDivision === div.key
                  ? 'bg-idm-gold-warm/15 text-idm-gold-warm shadow-sm shadow-idm-gold-warm/10 border border-idm-gold-warm/25'
                  : 'text-muted-foreground/70 hover:text-foreground border border-transparent hover:bg-muted/40'
              }`}
            >
              {div.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results based on selected tab */}
      {hasAnyMatches ? (
        <div className="space-y-4">
          {/* Semua tab — show both divisions (always show both, ghost empty for missing) */}
          {hasilDivision === 'all' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DivisionHasilCard
                division="male"
                matchesGrouped={maleMatchesGrouped}
                totalMatches={maleMatches.length}
                isEmpty={!hasMaleMatches}
              />
              <DivisionHasilCard
                division="female"
                matchesGrouped={femaleMatchesGrouped}
                totalMatches={femaleMatches.length}
                isEmpty={!hasFemaleMatches}
              />
            </div>
          )}

          {/* Male tab — show only male division */}
          {hasilDivision === 'male' && (
            <DivisionHasilCard
              division="male"
              matchesGrouped={maleMatchesGrouped}
              totalMatches={maleMatches.length}
              isEmpty={!hasMaleMatches}
            />
          )}

          {/* Female tab — show only female division */}
          {hasilDivision === 'female' && (
            <DivisionHasilCard
              division="female"
              matchesGrouped={femaleMatchesGrouped}
              totalMatches={femaleMatches.length}
              isEmpty={!hasFemaleMatches}
            />
          )}
        </div>
      ) : (
        <Card className={`${ct.casinoCard} overflow-hidden`}>
          <div className={ct.casinoBar} />
          <div className="p-8 text-center">
            <Gamepad2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-muted-foreground mb-0.5">Belum Ada Hasil Pertandingan</h3>
            <p className="text-[10px] text-muted-foreground/60">Hasil match akan muncul setelah pertandingan selesai</p>
          </div>
        </Card>
      )}
    </div>
  );
});


/* ─── Division Hasil Card — Per-division match results grouped by round/bracket ─── */
const DivisionHasilCard = React.memo(function DivisionHasilCard({
  division,
  matchesGrouped,
  totalMatches,
  isEmpty,
}: {
  division: 'male' | 'female';
  matchesGrouped: Record<string, UnifiedMatchResult[]>;
  totalMatches: number;
  isEmpty: boolean;
}) {
  const dt = getDivisionTheme(division);
  const emoji = division === 'male' ? '🕺' : '💃';

  // Sort group keys by round order
  const sortedKeys = Object.keys(matchesGrouped).sort((a, b) => {
    const mA = matchesGrouped[a]?.[0];
    const mB = matchesGrouped[b]?.[0];
    if (!mA || !mB) return 0;
    return getRoundSortKey(mA.bracket, mA.round) - getRoundSortKey(mB.bracket, mB.round);
  });

  // Ghost empty state — show skeleton rounds
  if (isEmpty) {
    return (
      <SectionCard title={`${emoji} Hasil Match`} icon={Trophy} badge="0 Match">
        <div className="space-y-3">
          {/* Ghost round placeholders */}
          {['⬆️ Semi Final', '⬇️ Semi Final', '🏆 Grand Final'].map((label, idx) => (
            <div key={idx} className="opacity-30">
              <div className="flex items-center gap-3 mb-2">
                <div className={`px-2 py-0.5 rounded-md ${dt.bg} ${dt.text} text-[9px] font-bold uppercase tracking-wider`}>
                  {label}
                </div>
                <div className={`flex-1 h-px ${dt.borderSubtle}`} />
                <span className="text-[8px] text-muted-foreground">—</span>
              </div>
              <div className="space-y-1.5">
                <div className={`rounded-lg ${dt.bgSubtle} ${dt.borderSubtle} border h-[52px] flex items-center justify-center`}>
                  <span className="text-[10px] text-muted-foreground/40 italic">Belum ada hasil</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={`${emoji} Hasil Match`} icon={Trophy} badge={`${totalMatches} Match`}>
      <div className="space-y-4">
        {sortedKeys.map(key => {
          const matches = matchesGrouped[key];
          const firstMatch = matches[0];
          const roundLabel = firstMatch ? getRoundLabel(firstMatch.bracket, firstMatch.round) : `Round ${key}`;
          const isGrandFinal = firstMatch?.bracket === 'grand_final';

          return (
            <div key={key}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`px-2 py-0.5 rounded-md ${dt.bg} ${dt.text} text-[9px] font-bold uppercase tracking-wider whitespace-nowrap`}>
                  {roundLabel}
                </div>
                <div className={`flex-1 h-px ${dt.borderSubtle}`} />
                <span className="text-[8px] text-muted-foreground">{matches.length} match</span>
              </div>
              <div className="space-y-1.5">
                {matches.map(m => {
                  // Grand Final — special champion rendering
                  if (isGrandFinal && m.score1 != null && m.score2 != null) {
                    const winner1 = m.score1 > m.score2;
                    const winner2 = m.score2 > m.score1;
                    return (
                      <div key={m.id} className={`group flex items-stretch rounded-lg overflow-hidden border transition-all hover:shadow-sm ${dt.bgSubtle} border-idm-gold-warm/30`}>
                        {/* Champion left bar */}
                        <div className="w-10 shrink-0 flex items-center justify-center bg-idm-gold-warm/20 border-r border-idm-gold-warm/25">
                          <span className="text-base">🏆</span>
                        </div>
                        {/* Match content */}
                        <div className="flex-1 min-w-0">
                          {/* Team 1 */}
                          <div className={`flex items-center px-3 py-2 border-b ${dt.borderSubtle} ${winner1 ? 'bg-idm-gold-warm/10' : 'opacity-60'}`}>
                            {winner1 && <span className="text-sm mr-1.5">👑</span>}
                            <span className={`text-xs font-bold truncate flex-1 ${winner1 ? 'text-idm-gold-warm' : 'text-muted-foreground'}`}>
                              {m.name1}
                            </span>
                            {winner1 && <span className="text-[8px] font-black text-idm-gold-warm/70 uppercase tracking-wider mr-2">Champion</span>}
                            <span className={`text-sm font-bold tabular-nums w-6 text-right ${winner1 ? 'text-idm-gold-warm' : 'text-foreground'}`}>{m.score1}</span>
                          </div>
                          {/* Team 2 */}
                          <div className={`flex items-center px-3 py-2 ${winner2 ? 'bg-idm-gold-warm/10' : 'opacity-60'}`}>
                            {winner2 && <span className="text-sm mr-1.5">👑</span>}
                            <span className={`text-xs font-bold truncate flex-1 ${winner2 ? 'text-idm-gold-warm' : 'text-muted-foreground'}`}>
                              {m.name2}
                            </span>
                            {winner2 && <span className="text-[8px] font-black text-idm-gold-warm/70 uppercase tracking-wider mr-2">Champion</span>}
                            <span className={`text-sm font-bold tabular-nums w-6 text-right ${winner2 ? 'text-idm-gold-warm' : 'text-foreground'}`}>{m.score2}</span>
                          </div>
                        </div>
                        {/* Status */}
                        <div className="w-16 shrink-0 flex flex-col items-center justify-center border-l border-idm-gold-warm/20">
                          <Badge className="bg-idm-gold-warm/15 text-idm-gold-warm text-[8px] border border-idm-gold-warm/25 font-black">FT</Badge>
                        </div>
                      </div>
                    );
                  }
                  // Regular match — standard MatchRow
                  return (
                    <MatchRow
                      key={m.id}
                      club1={m.name1}
                      club2={m.name2}
                      score1={m.score1 ?? 0}
                      score2={m.score2 ?? 0}
                      status="completed"
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
});


/* ═══════════════════════════════════════════
   Division Standings Section — Community Leaderboard
   ═══════════════════════════════════════════ */

const DivisionStandingsSection = React.memo(function DivisionStandingsSection({
  maleData,
  femaleData,
  selectedDivision,
  onPlayerClick,
  onClubClick,
  leaderboardSort,
  onLeaderboardSortChange,
  divisionFilter,
  onDivisionFilterChange,
}: {
  maleData?: StatsData;
  femaleData?: StatsData;
  selectedDivision: DivisionFilter;
  onPlayerClick: (player: TopPlayer & { division?: string }, division: 'male' | 'female') => void;
  onClubClick: (club: StatsData['clubs'][0]) => void;
  leaderboardSort?: 'players' | 'clubs';
  onLeaderboardSortChange?: (sort: 'players' | 'clubs') => void;
  divisionFilter?: 'all' | 'male' | 'female';
  onDivisionFilterChange?: (filter: 'all' | 'male' | 'female') => void;
}) {
  return (
    <CommunityLeaderboard
      maleData={maleData}
      femaleData={femaleData}
      onPlayerClick={onPlayerClick}
      onClubClick={onClubClick}
      leaderboardSort={leaderboardSort}
      onLeaderboardSortChange={onLeaderboardSortChange}
      divisionFilter={divisionFilter}
      onDivisionFilterChange={onDivisionFilterChange}
    />
  );
});



/* ═══════════════════════════════════════════
   Tour Saya / Cari Turnamen Kamu Section
   ═══════════════════════════════════════════ */
const TourSayaSection = React.memo(function TourSayaSection({
  selectedDivision,
}: {
  selectedDivision: DivisionFilter;
}) {
  const { playerAuth } = useAppStore();
  const effectiveDivision: 'male' | 'female' = selectedDivision === 'female' ? 'female' : 'male';
  // Gold luxury theme for outer UI — division-specific colors only inside result cards
  const ct = getCommunityTheme();

  const [searchName, setSearchName] = useState(() =>
    playerAuth.isAuthenticated && playerAuth.account ? playerAuth.account.player.gamertag : ''
  );
  const [submittedName, setSubmittedName] = useState('');
  const [showAllMatches, setShowAllMatches] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loggedInGamertag = playerAuth.isAuthenticated && playerAuth.account ? playerAuth.account.player.gamertag : null;
  const loggedInSkins = playerAuth.isAuthenticated && playerAuth.account ? playerAuth.account.skins : undefined;

  // Tournament overview query
  const { data: overview } = useQuery({
    queryKey: ['tournament-overview', effectiveDivision],
    queryFn: async () => {
      const res = await fetch(`/api/tournaments/overview?division=${effectiveDivision}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  // My-status query — when 'semua' selected, search BOTH divisions (no division filter)
  const { data: myStatus, isLoading: myStatusLoading, error: myStatusError } = useQuery({
    queryKey: ['my-tournament-status', submittedName, selectedDivision],
    queryFn: async () => {
      const divisionParam = selectedDivision === 'all' ? '' : `&division=${effectiveDivision}`;
      const res = await fetch(`/api/tournaments/my-status?name=${encodeURIComponent(submittedName)}&gamertag=${encodeURIComponent(submittedName)}${divisionParam}`);
      if (!res.ok) throw new Error('Gagal mengambil data');
      return res.json();
    },
    enabled: !!submittedName,
    refetchInterval: 30000,
  });

  const handleSearch = () => {
    if (!searchName.trim()) return;
    setSubmittedName(searchName.trim());
    setShowAllMatches(false);
  };

  const handleReset = () => {
    setSubmittedName('');
    setSearchName('');
    setShowAllMatches(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  /* ─── Render search results ─── */
  const renderMyTournamentResults = () => {
    if (!submittedName) return null;

    if (myStatusLoading) {
      return (
        <Card className={`${ct.casinoCard}`}>
          <CardContent className="p-5 relative z-10 text-center">
            <div className="animate-spin-slow inline-block mb-3">
              <Trophy className={`w-8 h-8 ${ct.neonText}`} />
            </div>
            <p className="text-sm text-muted-foreground">Mencari data turnamen...</p>
          </CardContent>
        </Card>
      );
    }

    if (myStatusError) {
      return (
        <Card className={`${ct.casinoCard}`}>
          <CardContent className="p-5 relative z-10">
            <div className="text-center py-4">
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-red-400 mb-1">Gagal Memuat Data</h3>
              <p className="text-xs text-muted-foreground mb-3">Terjadi kesalahan saat mencari. Coba lagi.</p>
              <Button size="sm" variant="outline" onClick={handleReset}>Kembali</Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!myStatus?.found) {
      return (
        <Card className={`${ct.casinoCard}`}>
          <CardContent className="p-5 relative z-10">
            <div className="text-center py-4">
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-red-400 mb-1">Tidak Ditemukan</h3>
              <p className="text-xs text-muted-foreground mb-1">{myStatus?.message || 'Nama tidak ditemukan dalam database'}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-2">Pastikan nama atau gamertag sudah benar.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!myStatus.hasActiveTournament) {
      return (
        <Card className={`${ct.casinoCard}`}>
          <div className={ct.casinoBar} />
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${ct.iconBg}`}>
                <Users className={`w-5 h-5 ${ct.neonText}`} />
              </div>
              <div>
                <p className="text-sm font-bold">{myStatus.player.gamertag}</p>
                <p className="text-[10px] text-muted-foreground">{myStatus.player.name} • {myStatus.player.city}</p>
              </div>
            </div>
            <div className="text-center py-4">
              <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-bold mb-1">Belum Ada Turnamen Aktif</h3>
              <p className="text-xs text-muted-foreground">{myStatus.message}</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!myStatus.myTeam) {
      return (
        <Card className={`${ct.casinoCard}`}>
          <div className={ct.casinoBar} />
          <CardContent className="p-5 relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${ct.iconBg}`}>
                <Users className={`w-5 h-5 ${ct.neonText}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <SkinName skin={myStatus.player.gamertag === loggedInGamertag && loggedInSkins?.length ? getPrimarySkin(loggedInSkins) : null}>
                    <p className="text-sm font-bold truncate">{myStatus.player.gamertag}</p>
                  </SkinName>
                  {myStatus.player.gamertag === loggedInGamertag && loggedInSkins && loggedInSkins.length > 0 && <SkinBadgesRow skins={loggedInSkins} />}
                </div>
                <p className="text-[10px] text-muted-foreground">{myStatus.player.name} • {myStatus.player.city}</p>
              </div>
              
            </div>
            <div className={`p-4 sm:p-5 rounded-lg ${ct.bgSubtle} border ${ct.borderSubtle} mb-4`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{myStatus.tournament.name}</span>
                <Badge className={`${ct.casinoBadge} text-[9px]`}>Week {myStatus.tournament.weekNumber}</Badge>
              </div>
              <TournamentProgress status={myStatus.tournament.status} divisionTheme={ct} />
            </div>
            <div className="text-center py-3">
              <Shield className={`w-8 h-8 ${ct.neonText} mx-auto mb-2 opacity-50`} />
              <h3 className="text-sm font-bold mb-1">
                {myStatus.tournament.isCompleted ? 'Turnamen Sudah Selesai' :
                 myStatus.tournament.status === 'registration' ? 'Pendaftaran Dibuka' :
                 myStatus.tournament.status === 'approval' ? 'Menunggu Persetujuan' :
                 'Belum Masuk Tim'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {myStatus.tournament.isCompleted ? 'Cek hasilnya di Arena Live.' :
                 myStatus.tournament.status === 'approval' ? (myStatus.participationStatus === 'registered' ? 'Pendaftaran kamu sedang menunggu persetujuan admin.' : myStatus.participationStatus === 'approved' ? 'Kamu sudah disetujui! Tim akan segera dibentuk.' : myStatus.message) :
                 myStatus.message}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    /* ─── FULL RESULTS: Player Has a Team ─── */
    const myTeam = myStatus.myTeam;
    const myMatches = myStatus.myMatches || [];
    const liveMatch = myStatus.liveMatch;
    const nextMatch = myStatus.nextMatch;
    const nextOpponent = myStatus.nextOpponent;
    const totalRounds = Math.max(...myMatches.map((m: any) => m.round), 1);

    return (
      <div className="space-y-3">
        {/* Player + Team Header */}
        <Card className={`${ct.casinoCard} ${ct.cornerAccent} overflow-hidden`}>
          <div className={ct.casinoBar} />
          <CardContent className="p-0 relative z-10">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${ct.iconBg}`}>
                  <Users className={`w-5 h-5 ${ct.neonText}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <SkinName skin={myStatus.player.gamertag === loggedInGamertag && loggedInSkins?.length ? getPrimarySkin(loggedInSkins) : null}>
                      <p className="text-sm font-bold truncate">{myStatus.player.gamertag}</p>
                    </SkinName>
                    {myStatus.player.gamertag === loggedInGamertag && loggedInSkins && loggedInSkins.length > 0 && <SkinBadgesRow skins={loggedInSkins} />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{myStatus.player.name} • {myStatus.player.city}</p>
                </div>
                
              </div>
              <div className={`p-4 sm:p-5 rounded-2xl border ${myStatus.isChampion ? 'border-yellow-500/40 bg-yellow-500/5' : myStatus.isEliminated ? 'border-red-500/20 bg-red-500/5' : `${ct.borderSubtle} ${ct.bgSubtle}`}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {myStatus.isChampion && <Crown className="w-4 h-4 text-yellow-500" />}
                    <span className={`text-sm font-bold ${myStatus.isChampion ? 'text-yellow-500' : myStatus.isEliminated ? 'text-red-400' : ct.neonText}`}>
                      {myTeam.name}
                    </span>
                  </div>
                  {myStatus.isChampion ? (
                    <Badge className="bg-yellow-500/15 text-yellow-500 border-0 text-[9px]"><Crown className="w-3 h-3 mr-0.5" /> Juara!</Badge>
                  ) : myStatus.isEliminated ? (
                    <Badge className="bg-red-500/15 text-red-400 border-0 text-[9px]"><XCircle className="w-3 h-3 mr-0.5" /> Tereliminasi</Badge>
                  ) : (
                    <Badge className="bg-green-500/15 text-green-400 border-0 text-[9px]"><Play className="w-3 h-3 mr-0.5" /> Masih Bermain</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {myTeam.teammates.map((tm: any) => (
                    <div key={tm.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] ${
                      tm.isMe
                        ? 'bg-gradient-to-r from-idm-gold-warm/20 to-idm-gold-warm/5 border border-idm-gold-warm/30'
                        : `${ct.bgSubtle}`
                    }`}>
                      <span className={tm.isMe ? 'font-bold' : ''}>{tm.gamertag}</span>
                      {tm.isMe && <span className="text-[8px] opacity-60">(kamu)</span>}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/20">
                  <span className="text-[10px] text-muted-foreground">
                    Rekor: <span className="text-green-400 font-bold">{myStatus.matchRecord.wins}W</span>
                    <span className="mx-0.5">-</span>
                    <span className="text-red-400 font-bold">{myStatus.matchRecord.losses}L</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Kekuatan: <span className="font-bold">{myTeam.power}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className={`px-4 py-2.5 border-t ${ct.borderSubtle} bg-muted/20`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground">{myStatus.tournament.name} • Week {myStatus.tournament.weekNumber}</span>
                <Badge className={`${ct.casinoBadge} text-[9px]`}>{myStatus.tournament.format?.replace('_', ' ').toUpperCase()}</Badge>
              </div>
              <TournamentProgress status={myStatus.tournament.status} divisionTheme={ct} />
            </div>
          </CardContent>
        </Card>

        {/* Live / Next / Status + Match History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="space-y-3">
            {liveMatch && (
              <Card className="border-red-500/40 bg-red-500/5 shadow-lg shadow-red-500/10">
                <CardContent className="p-4 relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-red-500 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-red-500">LIVE SEKARANG!</h3>
                      <p className="text-[10px] text-muted-foreground">{getRoundLabelFromTotal(liveMatch.round, totalRounds)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 sm:p-5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <span className="text-xs font-bold">{myTeam.name}</span>
                    <span className="text-sm font-bold tabular-nums text-red-400">
                      {liveMatch.myScore ?? 0} - {liveMatch.opponentScore ?? 0}
                    </span>
                    <span className="text-xs font-bold">{liveMatch.opponent.name}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {nextMatch && !myStatus.isEliminated && !liveMatch && (
              <Card className={`${ct.casinoCard} border-green-500/20`}>
                <CardContent className="p-4 relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ct.iconBg}`}>
                      <Trophy className={`w-4 h-4 ${ct.neonText}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Lawan Selanjutnya</h3>
                      <p className="text-[10px] text-muted-foreground">{getRoundLabelFromTotal(nextMatch.round, totalRounds)}</p>
                    </div>
                  </div>
                  <div className={`p-4 sm:p-5 rounded-2xl border ${ct.borderSubtle}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">{nextOpponent?.name || 'TBD'}</span>
                      <Badge className={`${ct.casinoBadge} text-[9px]`}>Lawan</Badge>
                    </div>
                    {nextOpponent?.players?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {nextOpponent.players.map((p: any) => (
                          <div key={p.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/30 text-[10px]">
                            <span>{p.gamertag}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {myStatus.isEliminated && !myStatus.isChampion && (
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-red-400">Tim Tereliminasi</h3>
                      <p className="text-[10px] text-muted-foreground">{myStatus.eliminationInfo || 'Tim kamu telah gugur dari bracket'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {myStatus.isChampion && (
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="p-4 relative z-10 text-center">
                  <div className="animate-pulse-scale inline-block mb-2">
                    <Trophy className="w-10 h-10 text-yellow-500" />
                  </div>
                  <h3 className="text-base font-bold text-yellow-500 mb-1">Selamat, Juara!</h3>
                  <p className="text-xs text-muted-foreground">{myTeam.name} memenangkan tournament ini!</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Match History */}
          {myMatches.length > 0 && (
            <Card className={`${ct.casinoCard}`}>
              <div className={ct.casinoBar} />
              <CardContent className="p-0 relative z-10">
                <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${ct.borderSubtle}`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider">Riwayat Match</h3>
                  <Badge className={`${ct.casinoBadge} ml-auto text-[9px]`}>{myStatus.completedMatchCount} Main</Badge>
                </div>
                <div className="p-3 space-y-1.5 sm:max-h-80 sm:overflow-y-auto custom-scrollbar">
                  {(showAllMatches ? myMatches : myMatches.slice(0, 5)).map((m: any) => (
                    <div key={m.id} className={`p-3 sm:p-4 rounded-lg border ${
                      m.won ? `border-green-500/20 ${ct.bgSubtle}` :
                      m.lost ? 'border-red-500/10' :
                      'border-border/20'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-muted-foreground">{getRoundLabelFromTotal(m.round, totalRounds)}</span>
                        <div className="flex items-center gap-1.5">
                          {m.won && <Badge className="bg-green-500/15 text-green-400 border-0 text-[8px]">Menang</Badge>}
                          {m.lost && <Badge className="bg-red-500/15 text-red-400 border-0 text-[8px]">Kalah</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold flex-1 ${m.won ? 'text-green-400' : ''}`}>{myTeam.name}</span>
                        <span className={`text-sm font-bold tabular-nums ${m.won ? 'text-green-400' : m.lost ? 'text-red-400' : ''}`}>
                          {m.myScore !== null && m.opponentScore !== null ? `${m.myScore} - ${m.opponentScore}` : 'VS'}
                        </span>
                        <span className={`text-xs font-semibold flex-1 text-right ${m.lost ? 'text-red-400' : ''}`}>{m.opponent.name}</span>
                      </div>
                    </div>
                  ))}
                  {myMatches.length > 5 && (
                    <button onClick={() => setShowAllMatches(!showAllMatches)} className="w-full py-2 text-[10px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors min-h-[36px]">
                      {showAllMatches ? <>Tutup <ChevronUp className="w-3 h-3" /></> : <>Lihat semua ({myMatches.length}) <ChevronDown className="w-3 h-3" /></>}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`casino-card casino-card-community rounded-2xl p-3 sm:p-4 relative z-10`}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${ct.iconBg}`}>
          <Target className={`w-4.5 h-4.5 ${ct.neonText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gradient-fury">Cari Turnamen Kamu</h3>
          <p className="text-[10px] text-muted-foreground">Ketik nama/gamertag untuk cek status turnamen</p>
        </div>
        {submittedName && (
          <Button size="sm" variant="outline" className="h-8 text-[10px] shrink-0 gap-1 min-h-[32px]" onClick={handleReset}>
            ✕ Reset
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Nama atau gamertag..."
            className="pl-9 h-9 text-xs border-idm-gold-warm/10 focus:border-idm-gold-warm/25"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={!searchName.trim()}
          className={`h-9 px-4 text-xs font-bold bg-idm-gold-warm hover:bg-idm-amber text-black`}
        >
          <Search className="w-3.5 h-3.5 mr-1" />
          Cari
        </Button>
      </div>

      {/* Search results */}
      <div className="mt-3">
        {renderMyTournamentResults()}
      </div>
    </div>
  );
});


/* ═══════════════════════════════════════════
   LayoutRow — pairs sections side-by-side on desktop
   ═══════════════════════════════════════════ */
function LayoutRow({ children, cols = '2', className = '' }: { children: React.ReactNode; cols?: '2' | '3-2' | '2-3'; className?: string }) {
  const gridClass = cols === '3-2'
    ? 'lg:grid-cols-5'
    : cols === '2-3'
      ? 'lg:grid-cols-5'
      : 'lg:grid-cols-2';

  return (
    <div className={`grid grid-cols-1 ${gridClass} gap-5 lg:gap-6 ${className}`}>
      {children}
    </div>
  );
}


/* ═══════════════════════════════════════════
   Section wrapper with staggered reveal
   ═══════════════════════════════════════════ */
const Section = React.memo(function Section({
  children,
  className = '',
  title,
  icon: Icon,
  iconColor = 'text-idm-gold-warm',
  sectionId,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: typeof Trophy;
  iconColor?: string;
  sectionId?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      className={className}
      id={sectionId ? `section-${sectionId}` : undefined}
      style={style}
    >
      {title && Icon && (
        <div className="flex items-center gap-2 mb-3">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <h2 className="text-sm font-bold uppercase tracking-wider">{title}</h2>
          <div className="flex-1 h-px bg-border/20" />
        </div>
      )}
      {children}
    </section>
  );
});


/* ═══════════════════════════════════════════
   Loading Skeleton
   ═══════════════════════════════════════════ */
const CommunityDashboardSkeleton = React.memo(function CommunityDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl bg-idm-gold-warm/5 border border-idm-gold-warm/10 p-8">
        <Skeleton className="h-6 w-20 rounded-full mb-4" />
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="flex gap-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-idm-gold-warm/10 bg-idm-gold-warm/5 p-4">
            <div className="flex justify-between mb-3">
              <Skeleton className="w-9 h-9 rounded-2xl" />
              <Skeleton className="w-14 h-5" />
            </div>
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-idm-gold-warm/10 bg-idm-gold-warm/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="w-10 h-10 rounded-2xl" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-8 w-full rounded-lg mb-2" />
            <Skeleton className="h-8 w-full rounded-lg mb-2" />
            <Skeleton className="h-8 w-full rounded-lg mb-3" />
            <div className="flex justify-end"><Skeleton className="h-9 w-28 rounded-2xl" /></div>
          </div>
        ))}
      </div>
    </div>
  );
});





export function CommunityDashboard() {
  // Pusher real-time: already subscribed in AppShell (usePusherRealtime)
  // No duplicate subscription here to avoid double WebSocket connections

  // Selected player for profile modal
  const [selectedPlayer, setSelectedPlayer] = useState<(TopPlayer & { division?: string }) | null>(null);
  // Selected club for profile modal
  const [selectedClub, setSelectedClub] = useState<StatsData['clubs'][0] | null>(null);
  // Donation modal state
  const [donationOpen, setDonationOpen] = useState(false);
  // Registration modal state
  const [registrationOpen, setRegistrationOpen] = useState(false);
  // Payment modal state
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentDivision, setPaymentDivision] = useState<'male' | 'female'>('male');
  // Division filter — new state for division-specific content
  const [selectedDivision, setSelectedDivision] = useState<DivisionFilter>('all');
  // Peringkat leaderboard filter state — lifted from CommunityLeaderboard for sticky header
  const [leaderboardSort, setLeaderboardSort] = useState<'players' | 'clubs'>('players');
  const [leaderboardDivisionFilter, setLeaderboardDivisionFilter] = useState<'all' | 'male' | 'female'>('all');

  // Deferred values for expensive renders — keeps interactive elements responsive
  // while deferring the heavy content re-renders to idle time
  const deferredDivision = useDeferredValue(selectedDivision);
  const deferredLeaderboardSort = useDeferredValue(leaderboardSort);
  const deferredLeaderboardDivisionFilter = useDeferredValue(leaderboardDivisionFilter);
  // Track if rankings section is visible — hide sticky champion header when it is
  const [isRankingsVisible, setIsRankingsVisible] = useState(false);
  useEffect(() => {
    const el = document.getElementById('section-rankings');
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsRankingsVisible(entry.isIntersecting),
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  // Peringkat is no longer sticky — no need for intersection observer
  // Season selector — null means viewing the active season
  const [selectedSeason, setSelectedSeason] = useState<SelectedSeason | null>(null);

  // Derive effective division for division-specific queries
  const effectiveDivision: 'male' | 'female' = selectedDivision === 'female' ? 'female' : 'male';
  const deferredEffectiveDivision: 'male' | 'female' = deferredDivision === 'female' ? 'female' : 'male';

  // Whether we're viewing a completed/past season
  const isViewingPastSeason = selectedSeason !== null && selectedSeason.status === 'completed';

  // When division changes while viewing a past season, reset to active season
  const handleDivisionChange = useCallback((d: DivisionFilter) => {
    startTransition(() => {
      setSelectedDivision(d);
      if (selectedSeason) {
        setSelectedSeason(null);
      }
    });
  }, [selectedSeason]);

  // Handle season change
  const handleSeasonChange = useCallback((season: SelectedSeason | null) => {
    startTransition(() => {
      setSelectedSeason(season);
      if (season && season.division !== effectiveDivision) {
        setSelectedDivision(season.division);
      }
    });
  }, [effectiveDivision]);



  // CMS settings for donation modal
  const { data: cms } = useQuery<Record<string, string>>({
    queryKey: ['cms-content'],
    queryFn: async () => {
      const res = await fetch('/api/cms/content');
      if (!res.ok) return { settings: {}, sections: {} };
      return res.json();
    },
    select: (data) => data.settings || {},
  });

  // Fetch male stats — placeholderData prevents CLS from empty→filled layout shift
  const { data: maleData } = useQuery<StatsData>({
    queryKey: ['stats', 'male'],
    queryFn: async () => {
      const res = await fetch('/api/stats?division=male');
      return res.json();
    },
    staleTime: 30 * 1000,
    refetchInterval: 120 * 1000,
    placeholderData: (prev) => prev,
  });

  // Fetch female stats
  const { data: femaleData } = useQuery<StatsData>({
    queryKey: ['stats', 'female'],
    queryFn: async () => {
      const res = await fetch('/api/stats?division=female');
      return res.json();
    },
    staleTime: 30 * 1000,
    refetchInterval: 120 * 1000,
    placeholderData: (prev) => prev,
  });

  // Fetch league data
  const { data: leagueData } = useQuery<{
    hasData: boolean;
    stats?: { totalClubs: number; totalMatches: number; completedMatches: number; liveMatches: number };
    clubs?: Array<{
      id: string;
      name: string;
      logo?: string | null;
      wins: number;
      losses: number;
      points: number;
      malePoints: number;
      femalePoints: number;
      gameDiff: number;
      memberCount: number;
      maleMemberCount: number;
      femaleMemberCount: number;
    }>;
    tarkamChampion?: {
      id: string;
      name: string;
      logo?: string | null;
      seasonNumber: number;
      malePoints: number;
      femalePoints: number;
      totalPoints: number;
    } | null;
  }>({
    queryKey: ['league-community'],
    queryFn: async () => {
      const res = await fetch('/api/league');
      return res.json();
    },
    staleTime: 30 * 1000,
    refetchInterval: 120 * 1000,
    placeholderData: (prev) => prev,
  });

  // Player click handler
  const handlePlayerClick = useCallback((player: TopPlayer & { division?: string }, division: 'male' | 'female') => {
    setSelectedPlayer({
      ...player,
      division,
      club: clubToString(player.club as Parameters<typeof clubToString>[0]) || undefined,
    });
  }, []);

  // Modal handlers
  const handleDonate = useCallback(() => setDonationOpen(true), []);
  const handleRegister = useCallback(() => setRegistrationOpen(true), []);
  const handlePayment = useCallback((div: 'male' | 'female') => {
    setPaymentDivision(div);
    setPaymentOpen(true);
  }, []);
  const handleClosePlayer = useCallback(() => setSelectedPlayer(null), []);
  const handleCloseClub = useCallback(() => setSelectedClub(null), []);
  const handleClubClick = useCallback((club: StatsData['clubs'][0]) => setSelectedClub(club), []);
  const handleBackToActive = useCallback(() => setSelectedSeason(null), []);

  // Listen for deep-link club open events (from ?view=club&name=XXX URL param)
  useEffect(() => {
    const handler = (e: Event) => {
      const { name } = (e as CustomEvent).detail || {};
      if (!name) return;
      // Find club in already-loaded data
      const allClubs = [
        ...(maleData?.clubs || []),
        ...(femaleData?.clubs || []),
      ];
      const club = allClubs.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (club) setSelectedClub(club);
    };
    window.addEventListener('tarkam:open-club', handler);
    return () => window.removeEventListener('tarkam:open-club', handler);
  }, [maleData, femaleData]);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">

      {/* ═══ UNIFIED CONTENT SURFACE ═══
          Mobile: Full-bleed, no border-radius, no border — edge-to-edge like iOS apps
          Desktop: Premium elevated surface with rounded corners and border */}
      <div className="lg:community-surface lg:rounded-3xl lg:border lg:border-border/30 relative" style={{ overflow: 'clip' }}>
        {/* Subtle navy depth glow at top — dark canvas, no gold wash (desktop only) */}
        <div className="hidden lg:block absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-48 bg-slate-800/[0.08] rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Subtle atmospheric gradient */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 30% 10%, rgba(239,249,35,0.03) 0%, transparent 50%), radial-gradient(ellipse at 70% 90%, rgba(239,249,35,0.02) 0%, transparent 50%)'
          }} />
          <div className="relative z-10 p-1.5 sm:p-4 lg:p-5 space-y-4 sm:space-y-6 lg:space-y-8">

      {/* Context Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-idm-gold-warm/10 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-idm-gold-warm" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-idm-gold-warm">Komunitas</h2>
          <p className="text-[10px] text-muted-foreground/60">Dashboard turnamen & statistik</p>
        </div>
      </div>

      {/* ═══ 1. Hero — top of unified surface ═══ */}
      <Section sectionId="hero">
        <CommunityHero maleData={maleData} femaleData={femaleData} leagueData={leagueData} onSawer={handleDonate} onRegister={handleRegister} onPayment={handlePayment} />
      </Section>

      {/* ═══ Marquee Ticker — Live activity feed (full-bleed within surface) ═══ */}
      <div className="relative z-40 -mx-2 sm:-mx-4 lg:-mx-5 py-2.5 bg-background/90 border-y border-idm-gold-warm/10" style={{ contain: 'layout style' }}>
        <MarqueeTicker maleData={maleData} femaleData={femaleData} leagueData={leagueData} />
      </div>

      {/* Sponsor Banner */}
      <SponsorBanner placement="dashboard" className="flex items-center justify-center gap-4 flex-wrap" />

      {/* ═══ 2. Cari Turnamen Kamu — Right below hero, above match results ═══ */}
      <Section sectionId="tour-saya">
        <TourSayaSection selectedDivision={deferredDivision} />
      </Section>

      {/* ═══ 3. Hasil Pertandingan — Bracket-style match results ═══ */}
      <Section sectionId="matches" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}>
        <AnimatedSection variant="fadeUp">
          <BracketHasilSection maleData={maleData} femaleData={femaleData} />
        </AnimatedSection>
      </Section>

      {/* ═══ 4. Top Saweran ═══ */}
      <Section sectionId="saweran" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}>
        <TopDonorsWidget onDonate={handleDonate} statsData={deferredDivision === 'female' ? femaleData : maleData} statsData2={deferredDivision === 'female' ? maleData : femaleData} />
      </Section>

      {/* ═══ 4. Season Selector ═══ */}
      <Section sectionId="season-selector">
        <div className="flex items-center gap-2">
          <div className="ml-auto shrink-0">
            <SeasonSelector
              selectedSeason={selectedSeason}
              onSeasonChange={handleSeasonChange}
              selectedDivision={selectedDivision}
            />
          </div>
        </div>
      </Section>

      {/* ═══ HISTORICAL SEASON VIEW ═══ */}
      {isViewingPastSeason && selectedSeason ? (
        <HistoricalSeasonView
          season={selectedSeason}
          onBack={handleBackToActive}
        />
      ) : (
      <>

      {/* ═══ 4. ⭐ Champions & MVP + Peringkat ═══ */}
      <div className="space-y-4 sm:space-y-6">
        {/* Sticky Champion Header — hidden when rankings section is in view */}
        <div className={`sticky top-0 z-30 -mx-1.5 sm:-mx-4 lg:-mx-5 px-1.5 sm:px-4 lg:px-5 py-2.5 bg-background/95 backdrop-blur-md border-b border-idm-gold-warm/10 transition-all duration-300 ${isRankingsVisible ? 'opacity-0 pointer-events-none -translate-y-full' : 'opacity-100 translate-y-0'}`}>
          <ChampionsMvpHeader
            selectedDivision={selectedDivision}
            onDivisionChange={handleDivisionChange}
          />
        </div>

        <Section sectionId="champions" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 600px' }}>
          <AnimatedSection>
            <ChampionsMvpContent
              maleData={maleData}
              femaleData={femaleData}
              selectedDivision={deferredDivision}
              onPlayerClick={handlePlayerClick}
            />
          </AnimatedSection>
        </Section>

        {/* ═══ 6. Peringkat/Standings — People check ranking changes after match ═══ */}
        <Section sectionId="rankings" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}>
          <AnimatedSection variant="fadeUp">
            <div className="space-y-4">
              <PeringkatHeader
                leaderboardSort={leaderboardSort}
                onLeaderboardSortChange={(sort) => startTransition(() => setLeaderboardSort(sort))}
                divisionFilter={leaderboardDivisionFilter}
                onDivisionFilterChange={(filter) => startTransition(() => setLeaderboardDivisionFilter(filter))}
                maleData={maleData}
                femaleData={femaleData}
              />
              <DivisionStandingsSection
                maleData={maleData}
                femaleData={femaleData}
                selectedDivision={deferredDivision}
                onPlayerClick={handlePlayerClick}
                onClubClick={handleClubClick}
                leaderboardSort={deferredLeaderboardSort}
                onLeaderboardSortChange={(sort) => startTransition(() => setLeaderboardSort(sort))}
                divisionFilter={deferredLeaderboardDivisionFilter}
                onDivisionFilterChange={(filter) => startTransition(() => setLeaderboardDivisionFilter(filter))}
              />
            </div>
          </AnimatedSection>
        </Section>
      </div>

      {/* ═══ 7. Quick Stats Bar — Division-specific (when division selected) ═══ */}
      {deferredDivision !== 'all' && (
        <Section sectionId="quick-stats">
          {(deferredEffectiveDivision === 'male' ? maleData : femaleData) ? (
            <QuickStatsBar data={(deferredEffectiveDivision === 'male' ? maleData : femaleData)!} division={deferredEffectiveDivision} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ═══ End Active Season View ═══ */}
      </>
      )}

        </div>{/* /unified content inner */}
        </div>{/* /atmospheric wrapper */}
      </div>{/* /unified content surface */}

      {/* ═══ Donation Modal ═══ */}
      <DonationModal
        open={donationOpen}
        onOpenChange={setDonationOpen}
        defaultType="weekly"
        cmsSettings={cms || {}}
      />

      {/* ═══ Registration Modal ═══ */}
      <RegistrationModal
        open={registrationOpen}
        onClose={() => setRegistrationOpen(false)}
      />

      {/* ═══ Payment Modal ═══ */}
      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        division={paymentDivision}
      />

      {/* Player & Club Profile Modals */}
      {selectedPlayer && (
        <PlayerProfile
          player={selectedPlayer}
          onClose={handleClosePlayer}
          rank={((selectedPlayer.division === 'female' ? femaleData : maleData)?.topPlayers?.findIndex(p => p.id === selectedPlayer.id) ?? -1) + 1}
          skinMap={(selectedPlayer.division === 'female' ? femaleData : maleData)?.skinMap}
        />
      )}
      {selectedClub && (
        <ClubProfile
          club={selectedClub}
          onClose={handleCloseClub}
          onPlayerClick={(p) => {
            setSelectedPlayer({
              id: p.id,
              name: p.name || p.gamertag,
              gamertag: p.gamertag,
              avatar: p.avatar,
              tier: p.tier || 'C',
              points: p.points,
              totalWins: 0,
              totalMvp: 0,
              streak: 0,
              maxStreak: 0,
              matches: 0,
              division: p.division,
              city: p.city,
            });
            setSelectedClub(null);
          }}
        />
      )}
    </div>
  );
}
