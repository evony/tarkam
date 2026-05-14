// ═══════════════════════════════════════════════════════════
// LANDING DATA FETCHER — Server-side pre-fetching for SSR
// ═══════════════════════════════════════════════════════════
// Pre-fetches essential landing page data on the server so the
// initial HTML already contains real data (no stale flash).
// Client-side React Query will fetch FULL data and update.
//
// OPTIMIZED for Vercel free tier:
//   • unstable_cache with revalidation tags — avoids 20-30+ DB
//     queries on every ISR revalidation
//   • Batched N+1 champion/club/sultan queries into single
//     findMany calls (player, clubProfile, clubMember,
//     playerSeasonStats)
//   • approvedPlayerCount merged into main Promise.all
//   • leagueMatch.count batched into parallel query
//   • Completed-season snapshots used as-is (no live enrichment
//     when snapshot already has avatar/city/club)

import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { SEASON_TOTAL_WEEKS } from '@/lib/constants';
import { withDbRetry } from '@/lib/db-resilience';
import { buildSkinMap } from './build-skin-map';

// ─────────────────────────────────────────────────────────────
// fetchLandingStats — inner implementation (throws on failure)
// ─────────────────────────────────────────────────────────────
async function fetchLandingStatsInner(division: 'male' | 'female') {
  const divisionFilter = division;

  // Find seasons for this division
  const allSeasons = await withDbRetry(() => db.season.findMany({
    where: { division: divisionFilter, status: { in: ['active', 'completed'] } },
    orderBy: { number: 'desc' },
    include: { _count: { select: { tournaments: true } } },
  }));

  const season = allSeasons[0];

  if (!season) {
    return {
      hasData: false,
      division,
      allSeasons: [],
      weeklyChampions: [],
      weeklyTopPerformers: [],
      sultanOfWeekly: [],
      totalPlayers: 0,
      approvedPlayerCount: 0,
      topPlayers: [],
      clubs: [],
      skinMap: {},
      recentMatches: [],
      upcomingMatches: [],
      topDonors: [],
      mvpHallOfFame: [],
      totalPrizePool: 0,
      malePrizePool: 0,
      femalePrizePool: 0,
      activeTournamentPrizePool: 0,
      seasonDonationTotal: 0,
      seasonProgress: { totalWeeks: SEASON_TOTAL_WEEKS, completedWeeks: 0, percentage: 0 },
      activeTournament: null,
    };
  }

  // Find season with clubs (handles new seasons without clubs yet)
  const seasonWithClubs = await withDbRetry(() => db.season.findFirst({
    where: {
      division: divisionFilter,
      id: { in: allSeasons.map(s => s.id) },
      clubs: { some: {} },
    },
    orderBy: { number: 'desc' },
  }));

  const activeSeasonId = season.id;
  const clubSeasonId = seasonWithClubs?.id || season.id;

  // ── Collect IDs for batched enrichment queries ──────────────
  // Instead of N+1 per-season findUnique calls, we collect all
  // IDs upfront and issue a single findMany for each entity type.
  const allPlayerIds = Array.from(new Set([
    ...allSeasons.filter((s: any) => s.championPlayerId).map((s: any) => s.championPlayerId as string),
    ...allSeasons.filter((s: any) => s.sultanPlayerId).map((s: any) => s.sultanPlayerId as string),
  ]));

  const allClubProfileIds = Array.from(new Set(
    allSeasons.filter((s: any) => s.championClubId).map((s: any) => s.championClubId as string)
  ));

  const completedClubIds = Array.from(new Set(
    allSeasons.filter((s: any) => s.championClubId && s.status === 'completed').map((s: any) => s.championClubId as string)
  ));

  // ── Run all queries in parallel (main + batched enrichment) ─
  const [
    totalPlayers,
    seasonPointsRaw,
    allDivisionPlayers,
    clubs,
    tournaments,
    seasonDonations,
    approvedPlayerCount,
    batchPlayers,
    batchClubProfiles,
    batchClubMembers,
    allPlayersForDonorMatching,
  ] = await Promise.all([
    // Total players
    withDbRetry(() => db.player.count({ where: { division: divisionFilter, isActive: true, registrationStatus: 'approved' } })),

    // Per-season points aggregation
    withDbRetry(() => db.playerPoint.groupBy({
      by: ['playerId'],
      where: { seasonId: activeSeasonId },
      _sum: { amount: true },
    })),

    // All active players for leaderboard
    withDbRetry(() => db.player.findMany({
      where: { division: divisionFilter, isActive: true, registrationStatus: 'approved' },
      select: {
        id: true, name: true, gamertag: true, avatar: true, tier: true,
        points: true, totalWins: true, totalMvp: true, streak: true,
        maxStreak: true, matches: true, division: true, city: true, isActive: true,
        clubMembers: {
          where: { leftAt: null },
          include: { profile: { select: { id: true, name: true, logo: true } } },
          take: 1,
        },
      },
    })),

    // Clubs standings
    withDbRetry(() => db.club.findMany({
      where: { seasonId: clubSeasonId },
      orderBy: [{ points: 'desc' }, { gameDiff: 'desc' }],
      include: {
        profile: { include: { _count: { select: { members: true } } } },
        season: { select: { name: true, division: true } },
      },
    })),

    // Tournaments (for weekly champions)
    withDbRetry(() => db.tournament.findMany({
      where: { seasonId: { in: allSeasons.map(s => s.id) } },
      orderBy: { weekNumber: 'asc' },
      include: {
        _count: { select: { teams: true, participations: true } },
        teams: {
          where: { isWinner: true },
          include: {
            teamPlayers: {
              include: {
                player: {
                  include: {
                    clubMembers: {
                      where: { leftAt: null },
                      include: { profile: { select: { id: true, name: true, logo: true } } },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        participations: {
          where: { isMvp: true },
          include: { player: true },
        },
      },
    })),

    // Season donations
    withDbRetry(() => db.donation.findMany({
      where: {
        status: 'approved',
        division: divisionFilter,
        OR: [
          { seasonId: { in: allSeasons.map(s => s.id) } },
          { seasonId: null },
        ],
      },
    })),

    // ★ Approved player count (was separate await — now in Promise.all)
    withDbRetry(() => db.participation.count({
      where: {
        status: { in: ['approved', 'assigned'] },
        tournament: { seasonId: clubSeasonId },
        player: { division: divisionFilter },
      },
    })),

    // ★ Batch: all champion + sultan players (replaces per-season findUnique)
    allPlayerIds.length > 0
      ? withDbRetry(() => db.player.findMany({
          where: { id: { in: allPlayerIds } },
          include: {
            clubMembers: {
              where: { leftAt: null },
              include: { profile: { select: { id: true, name: true, logo: true } } },
              take: 1,
            },
          },
        }))
      : Promise.resolve([] as any[]),

    // ★ Batch: all champion club profiles (replaces per-season findUnique)
    allClubProfileIds.length > 0
      ? withDbRetry(() => db.clubProfile.findMany({
          where: { id: { in: allClubProfileIds } },
          select: { id: true, name: true, logo: true },
        }))
      : Promise.resolve([] as any[]),

    // ★ Batch: all club members for completed seasons (replaces per-season findMany)
    completedClubIds.length > 0
      ? withDbRetry(() => db.clubMember.findMany({
          where: { profileId: { in: completedClubIds }, leftAt: null },
          include: {
            player: { select: { id: true, gamertag: true, avatar: true, tier: true, division: true } },
          },
        }))
      : Promise.resolve([] as any[]),

    // ★ Cross-division players for Sultan of the Week donor matching
    // Sultan donor can be from ANY division, so we must search both male & female players
    withDbRetry(() => db.player.findMany({
      where: { isActive: true, registrationStatus: 'approved' },
      select: {
        id: true, name: true, gamertag: true, avatar: true, tier: true,
        points: true, totalWins: true, totalMvp: true, streak: true,
        division: true, city: true,
        clubMembers: {
          where: { leftAt: null },
          include: { profile: { select: { id: true, name: true, logo: true } } },
          take: 1,
        },
      },
    })),
  ]);

  // ── Build lookup maps from batched results ──
  const playersMap = new Map((batchPlayers as any[]).map((p: any) => [p.id, p]));
  const clubProfilesMap = new Map((batchClubProfiles as any[]).map((c: any) => [c.id, c]));
  const clubMembersByProfileId = new Map<string, any[]>();
  for (const cm of batchClubMembers as any[]) {
    const existing = clubMembersByProfileId.get(cm.profileId) || [];
    existing.push(cm);
    clubMembersByProfileId.set(cm.profileId, existing);
  }

  // ── Compute topPlayers leaderboard ──
  const seasonPointsMap = new Map(
    seasonPointsRaw.map((sp: { playerId: string; _sum: { amount: number | null } }) => [sp.playerId, sp._sum.amount || 0])
  );

  const topPlayers = (allDivisionPlayers as any[])
    .map(p => {
      const activeClub = p.clubMembers?.[0]?.profile;
      return {
        ...p,
        points: seasonPointsMap.get(p.id) || 0,
        seasonPoints: seasonPointsMap.get(p.id) || 0,
        lifetimePoints: p.points,
        club: activeClub ? { id: activeClub.id, name: activeClub.name, logo: activeClub.logo } : undefined,
      };
    })
    .sort((a: any, b: any) => {
      if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints;
      if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
      return b.totalMvp - a.totalMvp;
    });

  // ── Flatten clubs ──
  const flatClubs = clubs.map((c: any) => ({
    id: c.id,
    name: c.profile?.name || '',
    logo: c.profile?.logo || null,
    bannerImage: c.profile?.bannerImage || null,
    division: c.division,
    seasonId: c.seasonId,
    wins: c.wins,
    losses: c.losses,
    points: c.points,
    gameDiff: c.gameDiff,
    _count: { members: c.profile?._count?.members || 0 },
    profileId: c.profileId,
  }));

  // ── Compute weeklyChampions ──
  const completedTournaments = tournaments.filter(t => t.status === 'completed');
  const seasonLookup = new Map(allSeasons.map((s: any) => [s.id, s]));

  const weeklyChampions = completedTournaments.map(t => {
    const winnerTeam = t.teams[0];
    const mvpParticipation = t.participations.find((p: any) => p.isMvp);
    const mvpPlayer = mvpParticipation?.player;
    const tournamentSeason = seasonLookup.get(t.seasonId) as any;
    return {
      weekNumber: t.weekNumber,
      tournamentName: t.name,
      prizePool: t.prizePool,
      completedAt: t.completedAt,
      seasonId: t.seasonId,
      seasonNumber: tournamentSeason?.number ?? 1,
      seasonStatus: tournamentSeason?.status ?? 'active',
      winnerTeam: winnerTeam ? {
        name: winnerTeam.name,
        players: winnerTeam.teamPlayers.map((tp: any) => {
          const activeClub = tp.player.clubMembers?.[0]?.profile;
          return {
            id: tp.player.id,
            gamertag: tp.player.gamertag,
            avatar: tp.player.avatar,
            tier: tp.player.tier,
            points: seasonPointsMap.get(tp.player.id) || tp.player.points,
            totalWins: tp.player.totalWins,
            totalMvp: tp.player.totalMvp,
            streak: tp.player.streak,
            matches: tp.player.matches,
            club: activeClub ? { id: activeClub.id, name: activeClub.name, logo: activeClub.logo } : null,
            city: tp.player.city || null,
          };
        }),
      } : null,
      mvp: mvpPlayer ? {
        id: mvpPlayer.id, gamertag: mvpPlayer.gamertag, avatar: mvpPlayer.avatar,
        tier: mvpPlayer.tier, totalMvp: mvpPlayer.totalMvp, points: seasonPointsMap.get(mvpPlayer.id) || mvpPlayer.points,
      } : null,
    };
  });

  // ── Compute prize pools ──
  // IMPORTANT: Must match the /api/stats computation exactly:
  //   malePrizePool = basePrizePool from male tournaments + male weekly donations
  //   femalePrizePool = basePrizePool from female tournaments + female weekly donations
  // Previously SSR only counted donations (missing base prize pool), causing
  // SSR→API data mismatch (e.g. 10K vs 260K for male).
  const weeklyDonations = seasonDonations.filter(d => d.type === 'weekly');
  const donationTotal = weeklyDonations.reduce((sum, d) => sum + d.amount, 0);
  const maleDonationTotal = weeklyDonations.filter(d => d.division === 'male').reduce((sum, d) => sum + d.amount, 0);
  const femaleDonationTotal = weeklyDonations.filter(d => d.division === 'female').reduce((sum, d) => sum + d.amount, 0);

  // Sum base prize pool from all tournaments in the season (admin-inputted)
  const basePrizePoolTotal = tournaments.reduce((sum, t) => sum + (t.prizePool || 0), 0);
  const baseMalePrizePool = tournaments.filter(t => t.division === 'male').reduce((sum, t) => sum + (t.prizePool || 0), 0);
  const baseFemalePrizePool = tournaments.filter(t => t.division === 'female').reduce((sum, t) => sum + (t.prizePool || 0), 0);

  // Combined: base prize pool (admin) + saweran (donations) — SEASON AGGREGATE
  const totalPrizePool = basePrizePoolTotal + donationTotal;
  const malePrizePool = baseMalePrizePool + maleDonationTotal;
  const femalePrizePool = baseFemalePrizePool + femaleDonationTotal;
  const seasonDonationTotal = seasonDonations.reduce((sum, d) => sum + d.amount, 0);

  // ── Top donors ──
  const donorAccum = new Map<string, { totalAmount: number; donationCount: number }>();
  for (const d of seasonDonations) {
    const entry = donorAccum.get(d.donorName) ?? { totalAmount: 0, donationCount: 0 };
    donorAccum.set(d.donorName, {
      totalAmount: entry.totalAmount + d.amount,
      donationCount: entry.donationCount + 1,
    });
  }
  const topDonors = Array.from(donorAccum.entries())
    .map(([donorName, data]) => ({
      donorName,
      _sum: { amount: data.totalAmount },
      _count: { id: data.donationCount },
    }))
    .sort((a, b) => b._sum.amount - a._sum.amount)
    .slice(0, 5);

  // ── Season progress ──
  const completedWeeks = tournaments.filter(t => t.status === 'completed').length;

  // ── MVP Hall of Fame ──
  const mvpHallOfFame = completedTournaments
    .flatMap(t =>
      t.participations.map((p: any) => ({
        _sortKey: p.createdAt as Date,
        id: p.player.id, gamertag: p.player.gamertag, avatar: p.player.avatar,
        tier: p.player.tier, totalMvp: p.player.totalMvp, points: seasonPointsMap.get(p.player.id) || p.player.points,
        totalWins: p.player.totalWins, streak: p.player.streak,
        weekNumber: t.weekNumber, tournamentName: t.name,
      }))
    )
    .sort((a, b) => +b._sortKey - +a._sortKey)
    .map(({ _sortKey, ...rest }: any) => rest);

  // ── Sultan of the Week — top penyawer per tournament (SSR pre-fetch) ──
  // Replicates the same logic as /api/stats so the card renders immediately
  // instead of waiting for client-side React Query.
  const tournamentMap = new Map(tournaments.map((t: any) => [t.id, t]));

  // Group donations by tournamentId, then by donorName
  const tournamentDonors = new Map<string, Map<string, { totalAmount: number; donationCount: number }>>();
  for (const d of seasonDonations as any[]) {
    if (!d.tournamentId) continue;
    const tId = d.tournamentId as string;
    if (!tournamentMap.has(tId)) continue; // Only include donations for tournaments in our list

    let donorMap = tournamentDonors.get(tId);
    if (!donorMap) {
      donorMap = new Map();
      tournamentDonors.set(tId, donorMap);
    }
    const entry = donorMap.get(d.donorName) ?? { totalAmount: 0, donationCount: 0 };
    donorMap.set(d.donorName, {
      totalAmount: entry.totalAmount + d.amount,
      donationCount: entry.donationCount + 1,
    });
  }

  // Build cross-division player lookup for donor matching
  const playerByGamertag = new Map(
    (allPlayersForDonorMatching as any[]).map((p: any) => {
      const activeClub = p.clubMembers?.[0]?.profile;
      return [p.gamertag?.toLowerCase(), { ...p, club: activeClub ? { id: activeClub.id, name: activeClub.name, logo: activeClub.logo } : null }];
    })
  );

  // For each tournament with donations, find the top donor
  const sultanOfWeekly: any[] = [];
  for (const [tId, donorMap] of tournamentDonors) {
    const tournament = tournamentMap.get(tId);
    if (!tournament) continue;

    const sortedDonors = Array.from(donorMap.entries())
      .sort((a, b) => b[1].totalAmount - a[1].totalAmount);
    if (sortedDonors.length === 0) continue;

    const [topDonorName, topDonorData] = sortedDonors[0];

    // Match donorName to a player (cross-division)
    const matchedPlayer = playerByGamertag.get(topDonorName?.toLowerCase());
    let playerInfo: any = null;
    if (matchedPlayer) {
      playerInfo = {
        id: matchedPlayer.id,
        gamertag: matchedPlayer.gamertag,
        avatar: matchedPlayer.avatar,
        tier: matchedPlayer.tier,
        points: matchedPlayer.points,
        totalWins: matchedPlayer.totalWins,
        totalMvp: matchedPlayer.totalMvp,
        streak: matchedPlayer.streak,
        division: matchedPlayer.division,
        city: matchedPlayer.city || null,
        club: matchedPlayer.club || null,
      };
    }

    sultanOfWeekly.push({
      weekNumber: tournament.weekNumber,
      tournamentName: tournament.name,
      tournamentId: tId,
      tournamentDivision: tournament.division,
      donorName: topDonorName || 'Anonymous',
      totalAmount: topDonorData.totalAmount,
      donationCount: topDonorData.donationCount,
      player: playerInfo,
      isCrossDivision: playerInfo ? playerInfo.division !== tournament.division : false,
    });
  }

  // Sort by weekNumber ascending
  sultanOfWeekly.sort((a, b) => a.weekNumber - b.weekNumber);

  // ── Active Tournament + Prize Pool (SSR) ──
  // Find the active tournament: non-completed first, then latest in season
  // This must match the /api/stats logic for consistency
  const activeTournamentData = tournaments.find(t => t.status !== 'completed')
    || tournaments[tournaments.length - 1]
    || null;

  // Compute activeTournamentPrizePool: base prize pool + that tournament's weekly donations
  // When the "active" tournament is actually completed (no new week yet), prize pool resets to 0.
  const isActiveTournamentActuallyActive = activeTournamentData && activeTournamentData.status !== 'completed';
  const activeTournamentBasePrizePool = isActiveTournamentActuallyActive ? (activeTournamentData.prizePool || 0) : 0;
  const activeTournamentWeeklyDonations = isActiveTournamentActuallyActive
    ? weeklyDonations.filter(d => d.tournamentId === activeTournamentData?.id)
    : [];
  const activeTournamentDonationTotal = activeTournamentWeeklyDonations.reduce((sum, d) => sum + d.amount, 0);
  const activeTournamentPrizePool = activeTournamentBasePrizePool + activeTournamentDonationTotal;

  // Build active tournament info object for the UI
  const activeTournamentInfo = activeTournamentData ? {
    id: activeTournamentData.id,
    name: activeTournamentData.name,
    weekNumber: activeTournamentData.weekNumber,
    status: activeTournamentData.status,
    format: activeTournamentData.format,
    prizePool: activeTournamentData.prizePool || 0,
    basePrizePool: activeTournamentData.prizePool || 0,
    bpm: activeTournamentData.bpm || null,
    location: activeTournamentData.location || null,
    scheduledAt: activeTournamentData.scheduledAt || null,
    _count: {
      teams: activeTournamentData._count?.teams || 0,
      participations: activeTournamentData._count?.participations || 0,
    },
  } : null;

  // ── Batch: player season stats (depends on club member player IDs) ──
  const memberPlayerIds = Array.from(new Set((batchClubMembers as any[]).map((cm: any) => cm.player.id)));

  // Build season number → IDs from allSeasons (replaces per-season db.season.findMany)
  const seasonNumberToIds = new Map<number, string[]>();
  for (const s of allSeasons) {
    const existing = seasonNumberToIds.get(s.number) || [];
    existing.push(s.id);
    seasonNumberToIds.set(s.number, existing);
  }

  const completedSeasonNumbers: number[] = Array.from(new Set(
    allSeasons.filter((s: any) => s.championClubId && s.status === 'completed').map((s: any) => s.number as number)
  ));
  const allStatsSeasonIds: string[] = Array.from(new Set(
    completedSeasonNumbers.flatMap(n => seasonNumberToIds.get(n) || [])
  ));

  // Run player season stats + buildSkinMap in parallel
  const [batchPlayerSeasonStats, skinMapResult] = await Promise.all([
    (memberPlayerIds.length > 0 && allStatsSeasonIds.length > 0)
      ? withDbRetry(() => db.playerSeasonStats.findMany({
          where: { playerId: { in: memberPlayerIds }, seasonId: { in: allStatsSeasonIds } },
        }))
      : Promise.resolve([] as any[]),

    buildSkinMap({
      playerIds: topPlayers.map(p => p.id),
      allSeasons: allSeasons as any[],
      completedTournaments,
    }),
  ]);

  // Build stats map keyed by playerId → seasonNumber → { points, tier }
  // Replaces the per-season local statsMap with a single pre-computed structure
  const statsByPlayerAndSeasonNumber = new Map<string, Map<number, { points: number; tier: string }>>();
  for (const ps of batchPlayerSeasonStats as any[]) {
    const seasonForId = allSeasons.find(s => s.id === ps.seasonId);
    if (!seasonForId) continue;
    const sNumber = seasonForId.number;

    if (!statsByPlayerAndSeasonNumber.has(ps.playerId)) {
      statsByPlayerAndSeasonNumber.set(ps.playerId, new Map());
    }
    const playerStats = statsByPlayerAndSeasonNumber.get(ps.playerId)!;
    const existing = playerStats.get(sNumber);
    if (existing) {
      existing.points += ps.points;
      const tierOrder = ['S', 'A', 'B'];
      if (tierOrder.indexOf(ps.tier) < tierOrder.indexOf(existing.tier)) existing.tier = ps.tier;
    } else {
      playerStats.set(sNumber, { points: ps.points, tier: ps.tier });
    }
  }

  // ── Assemble allSeasonsInfo using batched lookup maps ───────
  // This replaces the Promise.all(allSeasons.map(async ...)) N+1 pattern
  // with synchronous map lookups over the pre-fetched batch data.
  const allSeasonsInfo = allSeasons.map((s: any) => {
    // ── Champion player ──
    let championPlayer: any = null;
    if (s.championPlayerId) {
      // Try snapshot first for completed seasons — use aggressively
      if (s.championPlayerSnapshot && s.status === 'completed') {
        try {
          const snapshot = JSON.parse(s.championPlayerSnapshot);
          championPlayer = {
            id: s.championPlayerId,
            gamertag: snapshot.gamertag || '',
            avatar: snapshot.avatar || null,
            tier: snapshot.tier || 'B',
            points: snapshot.points || 0,
            totalWins: snapshot.totalWins || 0,
            totalMvp: snapshot.totalMvp || 0,
            streak: snapshot.streak || 0,
            maxStreak: snapshot.maxStreak || 0,
            matches: snapshot.matches || 0,
            club: snapshot.club || null,
            city: snapshot.city || null,
            division: snapshot.division,
            hasSeasonChampionSkin: true, // Season champions always have the virtual skin
          };

          // ★ Enrich snapshot with live data only when snapshot is missing fields.
          // Uses batched playersMap instead of per-season findUnique.
          if (!snapshot.avatar || !snapshot.city || (typeof snapshot.club === 'string' || !snapshot.club)) {
            const livePlayer = playersMap.get(s.championPlayerId);
            if (livePlayer) {
              if (!snapshot.avatar && livePlayer.avatar) {
                championPlayer.avatar = livePlayer.avatar;
              }
              if (!snapshot.city && (livePlayer as any).city) {
                championPlayer.city = (livePlayer as any).city;
              }
              if (typeof snapshot.club === 'string' || !snapshot.club) {
                const activeClub = (livePlayer as any).clubMembers?.[0]?.profile;
                if (activeClub) {
                  championPlayer.club = { id: activeClub.id, name: activeClub.name, logo: activeClub.logo };
                }
              }
            }
          }
        } catch { /* fallback to live data from batch */ }
      }

      if (!championPlayer) {
        const player = playersMap.get(s.championPlayerId);
        if (player) {
          const activeClubProfile = (player as any).clubMembers?.[0]?.profile;
          championPlayer = {
            id: player.id, gamertag: player.gamertag, avatar: player.avatar,
            tier: player.tier, points: s.championPlayerPoints ?? player.points,
            totalWins: player.totalWins, totalMvp: player.totalMvp,
            streak: player.streak, maxStreak: player.maxStreak, matches: player.matches,
            club: activeClubProfile ? { id: activeClubProfile.id, name: activeClubProfile.name, logo: activeClubProfile.logo } : null,
            city: player.city || null, division: player.division,
            hasSeasonChampionSkin: true, // Season champions always have the virtual skin
          };
        }
      }
    }

    // ── Champion club ──
    let championClub: any = null;
    if (s.championClubId) {
      if (s.championClubSnapshot && s.status === 'completed') {
        try {
          const snapshot = JSON.parse(s.championClubSnapshot);
          championClub = { id: s.championClubId, name: snapshot.name || '', logo: snapshot.logo || null };

          // ★ Enrich snapshot with live logo only if missing.
          // Uses batched clubProfilesMap instead of per-season findUnique.
          if (!snapshot.logo) {
            const liveProfile = clubProfilesMap.get(s.championClubId);
            if (liveProfile?.logo) championClub.logo = liveProfile.logo;
          }
        } catch { /* fallback */ }
      }
      if (!championClub) {
        const profile = clubProfilesMap.get(s.championClubId);
        if (profile) championClub = { id: profile.id, name: profile.name, logo: profile.logo };
      }

      // Enrich with members for completed seasons.
      // Uses batched clubMembersByProfileId + statsByPlayerAndSeasonNumber
      // instead of per-season findMany for clubMember, season, and playerSeasonStats.
      if (championClub && s.status === 'completed') {
        const members = clubMembersByProfileId.get(s.championClubId) || [];
        const mappedMembers = members.map((cm: any) => {
          const seasonStats = statsByPlayerAndSeasonNumber.get(cm.player.id);
          const stat = seasonStats?.get(s.number);
          return {
            id: cm.player.id, gamertag: cm.player.gamertag, avatar: cm.player.avatar,
            tier: stat?.tier || cm.player.tier, points: stat?.points || 0, division: cm.player.division,
          };
        });
        championClub.members = mappedMembers;
        championClub.totalPoints = mappedMembers.reduce((sum: number, m: any) => sum + m.points, 0);
        championClub.maleScore = mappedMembers.filter((m: any) => m.division === 'male').reduce((sum: number, m: any) => sum + m.points, 0);
        championClub.femaleScore = mappedMembers.filter((m: any) => m.division === 'female').reduce((sum: number, m: any) => sum + m.points, 0);
      }
    }

    // ── Sultan of Season (top penyawer) ──
    // Uses batched playersMap instead of per-season findUnique.
    let sultanPlayer: any = null;
    if (s.sultanPlayerId) {
      const sultan = playersMap.get(s.sultanPlayerId);
      if (sultan) {
        const activeClub = (sultan as any).clubMembers?.[0]?.profile;
        sultanPlayer = {
          id: sultan.id,
          gamertag: sultan.gamertag,
          avatar: sultan.avatar,
          division: sultan.division,
          tier: sultan.tier,
          points: sultan.points,
          city: sultan.city || null,
          club: activeClub ? { id: activeClub.id, name: activeClub.name, logo: activeClub.logo } : null,
        };
      }
    }

    return {
      id: s.id, name: s.name, number: s.number, status: s.status,
      startDate: s.startDate, endDate: s.endDate,
      tournamentCount: s._count?.tournaments ?? 0,
      championClubId: s.championClubId,
      championPlayerId: s.championPlayerId,
      championPlayer, championClub,
      sultanPlayerId: s.sultanPlayerId,
      sultanPlayer,
    };
  });

  return {
    hasData: true,
    division,
    season: { id: season.id, name: season.name, number: season.number, status: season.status },
    allSeasons: allSeasonsInfo,
    topPlayers,
    clubs: flatClubs,
    weeklyChampions,
    mvpHallOfFame,
    totalPlayers,
    approvedPlayerCount,
    totalPrizePool,
    malePrizePool,
    femalePrizePool,
    activeTournamentPrizePool, // Computed from active tournament base + its donations
    seasonDonationTotal,
    topDonors,
    seasonProgress: {
      totalWeeks: SEASON_TOTAL_WEEKS,
      completedWeeks,
      percentage: SEASON_TOTAL_WEEKS > 0 ? Math.round((completedWeeks / SEASON_TOTAL_WEEKS) * 100) : 0,
    },
    // ── Simplified fields: loaded by client-side React Query ──
    skinMap: skinMapResult,
    weeklyTopPerformers: [] as any[],
    sultanOfWeekly,
    recentMatches: [] as any[],
    upcomingMatches: [] as any[],
    activeTournament: activeTournamentInfo,
  };
}

// ─── Cached wrapper — errors are NOT cached ───────────────────
const fetchLandingStatsCached = unstable_cache(
  fetchLandingStatsInner,
  ['landing-stats'],
  { revalidate: 120, tags: ['landing-stats'] }
);

/**
 * Fetch essential stats data for the landing page SSR.
 * Returns data compatible with the StatsData type used by components.
 * Some fields are simplified (empty arrays) — React Query fills them client-side.
 *
 * Wrapped with unstable_cache keyed on division, revalidating every 120s
 * with tag 'landing-stats' for on-demand revalidation.
 */
export async function fetchLandingStats(division: 'male' | 'female') {
  try {
    return await fetchLandingStatsCached(division);
  } catch (error) {
    console.error(`[landing-data] Failed to fetch ${division} stats:`, error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// fetchLandingLeague — inner implementation (throws on failure)
// ─────────────────────────────────────────────────────────────
async function fetchLandingLeagueInner() {
  const seasons = await withDbRetry(() => db.season.findMany({
    where: { status: { in: ['active', 'completed'] }, division: { in: ['male', 'female'] } },
    orderBy: { number: 'desc' },
    include: {
      championClub: {
        select: {
          id: true, name: true, logo: true,
          members: {
            where: { leftAt: null },
            include: { player: { select: { id: true, gamertag: true, division: true, tier: true, points: true, avatar: true } } },
          },
        },
      },
      championPlayer: {
        select: {
          id: true, gamertag: true, division: true, tier: true, points: true,
          avatar: true, totalWins: true, totalMvp: true,
        },
      },
    },
  }));

  if (!seasons || seasons.length === 0) {
    return { hasData: false, reason: 'no_season', tarkamChampion: null };
  }

  const season = seasons[0];
  const allSeasonIds = seasons.map(s => s.id);

  // ── Get ClubProfiles + league match count in parallel ──
  // ★ leagueMatch.count was an inline await — now batched into Promise.all
  const [clubProfiles, matchCount] = await Promise.all([
    withDbRetry(() => db.clubProfile.findMany({
      orderBy: { name: 'asc' },
      include: {
        members: {
          where: { leftAt: null },
          include: { player: { select: { id: true, gamertag: true, division: true, tier: true, points: true, avatar: true } } },
        },
        seasonEntries: { where: { seasonId: { in: allSeasonIds } } },
      },
    })),
    withDbRetry(() => db.leagueMatch.count({
      where: { seasonId: { in: allSeasonIds } },
    })),
  ]);

  if (clubProfiles.length === 0) {
    return {
      hasData: false,
      reason: 'no_clubs',
      season: { id: season.id, name: season.name, number: season.number },
      tarkamChampion: null,
    };
  }

  // ── Compute Tarkam club points ──
  const dedupedClubs = clubProfiles.map(profile => {
    const maleMembers = profile.members.filter(m => m.player.division === 'male');
    const femaleMembers = profile.members.filter(m => m.player.division === 'female');
    const malePoints = maleMembers.reduce((sum, m) => sum + m.player.points, 0);
    const femalePoints = femaleMembers.reduce((sum, m) => sum + m.player.points, 0);
    const tarkamPoints = malePoints + femalePoints;

    let totalWins = 0, totalLosses = 0, totalGameDiff = 0;
    for (const entry of profile.seasonEntries) {
      totalWins += entry.wins;
      totalLosses += entry.losses;
      totalGameDiff += entry.gameDiff;
    }

    return {
      id: profile.id, name: profile.name, logo: profile.logo,
      bannerImage: profile.bannerImage,
      points: tarkamPoints, malePoints, femalePoints,
      wins: totalWins, losses: totalLosses, gameDiff: totalGameDiff,
      memberCount: profile.members.length,
      maleMemberCount: maleMembers.length,
      femaleMemberCount: femaleMembers.length,
      members: profile.members.map(m => ({
        id: m.player.id, gamertag: m.player.gamertag, name: m.player.gamertag,
        division: m.player.division, tier: m.player.tier, points: m.player.points,
        role: m.role, avatar: m.player.avatar,
      })),
    };
  }).sort((a, b) => b.points - a.points);

  // ── Tarkam Champion ──
  const tarkamChampionClub = dedupedClubs[0] || null;

  const championSeason = seasons.find(s => s.championPlayerId && s.championPlayer);
  const tarkamPlayerChampion = championSeason?.championPlayer ? {
    id: championSeason.championPlayer.id,
    gamertag: championSeason.championPlayer.gamertag,
    division: championSeason.championPlayer.division,
    tier: championSeason.championPlayer.tier,
    points: championSeason.championPlayer.points,
    totalWins: championSeason.championPlayer.totalWins,
    totalMvp: championSeason.championPlayer.totalMvp,
    avatar: championSeason.championPlayer.avatar,
    seasonNumber: championSeason.number,
  } : null;

  const tarkamChampion = tarkamChampionClub ? {
    id: tarkamChampionClub.id, name: tarkamChampionClub.name, logo: tarkamChampionClub.logo,
    seasonNumber: season.number,
    malePoints: tarkamChampionClub.malePoints, femalePoints: tarkamChampionClub.femalePoints,
    totalPoints: tarkamChampionClub.points, members: tarkamChampionClub.members,
  } : null;

  const totalClubs = dedupedClubs.length;

  return {
    hasData: true,
    preSeason: dedupedClubs.length > 0 && matchCount === 0,
    season: { id: season.id, name: season.name, number: season.number },
    tarkamChampion,
    tarkamPlayerChampion,
    clubs: dedupedClubs,
    stats: {
      totalClubs,
      totalMatches: 0,
      completedMatches: 0,
      liveMatches: 0,
      totalWeeks: 0,
      playedWeeks: 0,
    },
    // Simplified fields — loaded by client-side React Query
    leagueMatches: [],
    playoffMatches: [],
    topPlayers: [],
    mvpCandidates: [],
  };
}

// ─── Cached wrapper for fetchLandingLeague ────────────────────
const fetchLandingLeagueCached = unstable_cache(
  fetchLandingLeagueInner,
  ['landing-league'],
  { revalidate: 120, tags: ['landing-league'] }
);

/**
 * Fetch essential league data for the landing page SSR.
 *
 * Wrapped with unstable_cache, revalidating every 120s
 * with tag 'landing-league' for on-demand revalidation.
 */
export async function fetchLandingLeague() {
  try {
    return await fetchLandingLeagueCached();
  } catch (error) {
    console.error('[landing-data] Failed to fetch league data:', error);
    return null;
  }
}
