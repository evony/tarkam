'use client';

import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { AvatarMedia } from '@/components/ui/avatar-media';
import {
  Music, Shield, Crown, Clock, Flame,
} from 'lucide-react';
import { MVPCardSkeleton } from '../ui/skeleton';
import { SectionHeader } from './shared';
import { fadeLeft, fadeRight, stagger } from './variants';
import { getAvatarUrl } from '@/lib/utils';
import type { StatsData } from '@/types/stats';

interface MvpSectionProps {
  maleData: StatsData | undefined;
  femaleData: StatsData | undefined;
  isDataLoading: boolean;
  cmsSections: Record<string, any>;
  setSelectedPlayer: (player: StatsData['topPlayers'][0] & { division?: string } | null) => void;
}

/* ── Theme-aware color sets for badge styling ── */
function getMvpBadgeColors(isLight: boolean) {
  return isLight
    ? { color: '#92780C', bg: 'rgba(146,120,12,0.15)', border: 'rgba(146,120,12,0.3)' }
    : { color: '#EFF923', bg: 'rgba(239,249,35,0.15)', border: 'rgba(239,249,35,0.3)' };
}

function getCyanBadgeColors(isLight: boolean) {
  return isLight
    ? { color: '#0e7490', bg: 'rgba(14,116,144,0.15)', border: 'rgba(14,116,144,0.3)', bar: '#0e7490', dash: 'rgba(14,116,144,0.25)', dashIcon: 'rgba(14,116,144,0.3)' }
    : { color: '#22d3ee', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.3)', bar: '#06b6d4', dash: 'rgba(6,182,212,0.25)', dashIcon: 'rgba(6,182,212,0.3)' };
}

function getPurpleBadgeColors(isLight: boolean) {
  return isLight
    ? { color: '#7e22ce', bg: 'rgba(126,34,206,0.15)', border: 'rgba(126,34,206,0.3)', bar: '#7e22ce', dash: 'rgba(126,34,206,0.25)', dashIcon: 'rgba(126,34,206,0.3)' }
    : { color: '#c084fc', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', bar: '#a855f7', dash: 'rgba(168,85,247,0.25)', dashIcon: 'rgba(168,85,247,0.3)' };
}

export function MvpSection({
  maleData,
  femaleData,
  isDataLoading,
  cmsSections,
  setSelectedPlayer,
}: MvpSectionProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  const mvpBadge = getMvpBadgeColors(isLight);
  const cyanBadge = getCyanBadgeColors(isLight);
  const purpleBadge = getPurpleBadgeColors(isLight);

  return (
    <>
      <section
        id="mvp"
        role="region"
        aria-label="MVP Arena"
        className="py-24 px-4 relative"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={stagger}>
            <SectionHeader
              icon={Crown}
              label={cmsSections.mvp?.subtitle || 'Hall of Fame'}
              title={cmsSections.mvp?.title || 'MVP Arena'}
              subtitle={cmsSections.mvp?.description || 'Pemain terbaik dari setiap divisi — Dipilih admin berdasarkan skor tertinggi'}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative max-w-5xl mx-auto">
              {isDataLoading ? (
                <>
                  <MVPCardSkeleton accent="#06b6d4" />
                  <MVPCardSkeleton accent="#a855f7" />
                </>
              ) : (
              <>
              {/* ===== Male MVP Card ===== */}
              <motion.div variants={fadeLeft}>
                {(() => {
                  const mvp = maleData?.mvpHallOfFame?.[0];
                  if (!mvp) return (
                    <div
                      className="rounded-[20px] min-h-[520px] flex flex-col items-center justify-center p-8"
                      style={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {/* Cyan accent bar top */}
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[20px]" style={{ backgroundColor: cyanBadge.bar }} />

                      {/* Dashed avatar placeholder */}
                      <div
                        className="w-28 h-28 rounded-full flex items-center justify-center mb-6"
                        style={{
                          border: `2px dashed ${cyanBadge.dash}`,
                        }}
                      >
                        <Crown className="w-16 h-16" style={{ color: cyanBadge.dashIcon }} />
                      </div>
                      <p
                        className="text-sm font-bold uppercase tracking-widest mb-2"
                        style={{ color: 'var(--foreground)' }}
                      >
                        MVP Belum Dipilih
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        Tunjukkan skillmu — jadilah MVP pertama di divisi ini!
                      </p>
                    </div>
                  );
                  return (
                    <div
                      className="relative rounded-[20px] overflow-hidden cursor-pointer group min-h-[520px] transition-colors duration-300"
                      style={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`View MVP profile: ${mvp.gamertag}`}
                      onClick={() => {
                        const found = maleData?.topPlayers?.find(p => p.gamertag === mvp.gamertag);
                        if (found) setSelectedPlayer({ ...found, division: 'male' });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          const found = maleData?.topPlayers?.find(p => p.gamertag === mvp.gamertag);
                          if (found) setSelectedPlayer({ ...found, division: 'male' });
                        }
                      }}
                    >
                      {/* Cyan Accent Bar Top */}
                      <div className="absolute top-0 left-0 right-0 h-1 z-20" style={{ backgroundColor: cyanBadge.bar }} />

                      {/* Full-Bleed Avatar Background */}
                      <AvatarMedia
                        src={getAvatarUrl(mvp.gamertag, 'male', mvp.avatar)}
                        alt={mvp.gamertag}
                        fill
                        sizes="50vw"
                        objectPosition="center 25%"
                        className="group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />

                      {/* Clean gradient overlay from bottom */}
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-b from-card/40 via-transparent to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                        {/* Division Badge */}
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                          style={{
                            backgroundColor: cyanBadge.bg,
                            border: `1px solid ${cyanBadge.border}`,
                          }}
                        >
                          <Music className="w-4 h-4" style={{ color: cyanBadge.color }} />
                          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cyanBadge.color }}>Cowo</span>
                        </div>
                        {/* MVP Badge */}
                        <div
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl"
                          style={{
                            backgroundColor: mvpBadge.bg,
                            border: `1px solid ${mvpBadge.border}`,
                          }}
                        >
                          <Crown className="w-5 h-5" style={{ color: mvpBadge.color }} />
                          <span className="text-sm font-black uppercase tracking-wider" style={{ color: mvpBadge.color }}>MVP</span>
                        </div>
                      </div>

                      {/* Bottom Info */}
                      <div className="absolute bottom-0 inset-x-0 p-5 z-10">
                        {/* Week */}
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-3.5 h-3.5" style={{ color: cyanBadge.color }} />
                          <span className="text-[11px] font-bold" style={{ color: cyanBadge.color }}>
                            Week {mvp.weekNumber}
                          </span>
                        </div>

                        {/* Gamertag */}
                        <p
                          className="text-3xl sm:text-4xl font-black leading-none"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {mvp.gamertag}
                        </p>

                        {/* Multi-MVP */}
                        <div className="flex items-center gap-2.5 mt-2">
                          {mvp.totalMvp > 1 && (
                            <span
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                              style={{
                                backgroundColor: mvpBadge.bg,
                                color: mvpBadge.color,
                              }}
                            >
                              {mvp.totalMvp}x MVP
                            </span>
                          )}
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center gap-5 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                          <div>
                            <p className="text-2xl font-black" style={{ color: cyanBadge.color }}>{mvp.points}</p>
                            <p className="text-[9px] uppercase font-semibold" style={{ color: 'var(--muted-foreground)' }}>Points</p>
                          </div>
                          <div className="w-px h-8" style={{ backgroundColor: 'var(--border)' }} />
                          <div>
                            <p className="text-2xl font-black" style={{ color: '#30d158' }}>{mvp.totalWins}</p>
                            <p className="text-[9px] uppercase font-semibold" style={{ color: 'var(--muted-foreground)' }}>Wins</p>
                          </div>
                          {mvp.streak > 0 && (
                            <>
                              <div className="w-px h-8" style={{ backgroundColor: 'var(--border)' }} />
                              <div>
                                <p className="text-2xl font-black flex items-center gap-1.5" style={{ color: '#ff9f0a' }}>
                                  <Flame className="w-5 h-5" />
                                  {mvp.streak}
                                </p>
                                <p className="text-[9px] uppercase font-semibold" style={{ color: 'var(--muted-foreground)' }}>Streak</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>

              {/* ===== Female MVP Card ===== */}
              <motion.div variants={fadeRight}>
                {(() => {
                  const mvp = femaleData?.mvpHallOfFame?.[0];
                  if (!mvp) return (
                    <div
                      className="rounded-[20px] min-h-[520px] flex flex-col items-center justify-center p-8"
                      style={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {/* Purple accent bar top */}
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[20px]" style={{ backgroundColor: purpleBadge.bar }} />

                      {/* Dashed avatar placeholder */}
                      <div
                        className="w-28 h-28 rounded-full flex items-center justify-center mb-6"
                        style={{
                          border: `2px dashed ${purpleBadge.dash}`,
                        }}
                      >
                        <Crown className="w-16 h-16" style={{ color: purpleBadge.dashIcon }} />
                      </div>
                      <p
                        className="text-sm font-bold uppercase tracking-widest mb-2"
                        style={{ color: 'var(--foreground)' }}
                      >
                        MVP Belum Dipilih
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        Tunjukkan skillmu — jadilah MVP pertama di divisi ini!
                      </p>
                    </div>
                  );
                  return (
                    <div
                      className="relative rounded-[20px] overflow-hidden cursor-pointer group min-h-[520px] transition-colors duration-300"
                      style={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`View MVP profile: ${mvp.gamertag}`}
                      onClick={() => {
                        const found = femaleData?.topPlayers?.find(p => p.gamertag === mvp.gamertag);
                        if (found) setSelectedPlayer({ ...found, division: 'female' });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          const found = femaleData?.topPlayers?.find(p => p.gamertag === mvp.gamertag);
                          if (found) setSelectedPlayer({ ...found, division: 'female' });
                        }
                      }}
                    >
                      {/* Purple Accent Bar Top */}
                      <div className="absolute top-0 left-0 right-0 h-1 z-20" style={{ backgroundColor: purpleBadge.bar }} />

                      {/* Full-Bleed Avatar Background */}
                      <AvatarMedia
                        src={getAvatarUrl(mvp.gamertag, 'female', mvp.avatar)}
                        alt={mvp.gamertag}
                        fill
                        sizes="50vw"
                        objectPosition="center 25%"
                        className="group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />

                      {/* Clean gradient overlay from bottom */}
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-b from-card/40 via-transparent to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                        {/* Division Badge */}
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                          style={{
                            backgroundColor: purpleBadge.bg,
                            border: `1px solid ${purpleBadge.border}`,
                          }}
                        >
                          <Shield className="w-4 h-4" style={{ color: purpleBadge.color }} />
                          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: purpleBadge.color }}>Cewe</span>
                        </div>
                        {/* MVP Badge */}
                        <div
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl"
                          style={{
                            backgroundColor: mvpBadge.bg,
                            border: `1px solid ${mvpBadge.border}`,
                          }}
                        >
                          <Crown className="w-5 h-5" style={{ color: mvpBadge.color }} />
                          <span className="text-sm font-black uppercase tracking-wider" style={{ color: mvpBadge.color }}>MVP</span>
                        </div>
                      </div>

                      {/* Bottom Info */}
                      <div className="absolute bottom-0 inset-x-0 p-5 z-10">
                        {/* Week */}
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-3.5 h-3.5" style={{ color: purpleBadge.color }} />
                          <span className="text-[11px] font-bold" style={{ color: purpleBadge.color }}>
                            Week {mvp.weekNumber}
                          </span>
                        </div>

                        {/* Gamertag */}
                        <p
                          className="text-3xl sm:text-4xl font-black leading-none"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {mvp.gamertag}
                        </p>

                        {/* Multi-MVP */}
                        <div className="flex items-center gap-2.5 mt-2">
                          {mvp.totalMvp > 1 && (
                            <span
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                              style={{
                                backgroundColor: mvpBadge.bg,
                                color: mvpBadge.color,
                              }}
                            >
                              {mvp.totalMvp}x MVP
                            </span>
                          )}
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center gap-5 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                          <div>
                            <p className="text-2xl font-black" style={{ color: purpleBadge.color }}>{mvp.points}</p>
                            <p className="text-[9px] uppercase font-semibold" style={{ color: 'var(--muted-foreground)' }}>Points</p>
                          </div>
                          <div className="w-px h-8" style={{ backgroundColor: 'var(--border)' }} />
                          <div>
                            <p className="text-2xl font-black" style={{ color: '#30d158' }}>{mvp.totalWins}</p>
                            <p className="text-[9px] uppercase font-semibold" style={{ color: 'var(--muted-foreground)' }}>Wins</p>
                          </div>
                          {mvp.streak > 0 && (
                            <>
                              <div className="w-px h-8" style={{ backgroundColor: 'var(--border)' }} />
                              <div>
                                <p className="text-2xl font-black flex items-center gap-1.5" style={{ color: '#ff9f0a' }}>
                                  <Flame className="w-5 h-5" />
                                  {mvp.streak}
                                </p>
                                <p className="text-[9px] uppercase font-semibold" style={{ color: 'var(--muted-foreground)' }}>Streak</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
              </>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
