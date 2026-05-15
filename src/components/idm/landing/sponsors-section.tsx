'use client';

import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Gem } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { SectionHeader } from './shared';

/* ── Sponsor data shape from API ── */
interface Sponsor {
  id: string;
  name: string;
  logo: string | null;
  website: string | null;
  tier: string;
  description: string | null;
  isActive: boolean;
  _count?: {
    tournamentSponsors: number;
    sponsoredPrizes: number;
    banners: number;
  };
}

/* ═══════════════════════════════════════════════════════════════
   Sponsors Section — "Didukung Oleh" (Supported By)
   Mobile-first redesign:
   - Mobile: Horizontal scroll carousel with larger cards
   - Desktop: Grid layout with premium cards
   - Self-contained reveal observer (fixes dynamic import visibility bug)
   ═══════════════════════════════════════════════════════════════ */
export function SponsorsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  /* ── Self-contained reveal: since this component is loaded via dynamic()
        with ssr: false, the parent useScrollReveal() observer won't detect it.
        We use our own IntersectionObserver to add the visible class. ── */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('section-reveal--visible');
          io.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { data, isLoading } = useQuery<{ sponsors: Sponsor[] }>({
    queryKey: ['sponsors-active'],
    queryFn: async () => {
      const res = await fetch('/api/sponsors?active=true');
      if (!res.ok) return { sponsors: [] };
      return res.json();
    },
    staleTime: 120000,
    gcTime: 300000,
  });

  const sponsors = data?.sponsors ?? [];

  // Don't render anything if no sponsors or still loading with no prior data
  if (!isLoading && sponsors.length === 0) return null;

  // Still loading and no data yet — show skeleton
  if (isLoading && sponsors.length === 0) {
    return (
      <section aria-label="Sponsors" className="relative py-12 sm:py-16 px-4 overflow-hidden bg-deep">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="h-4 w-24 rounded bg-idm-gold-warm/10 animate-pulse" />
          </div>
          {/* Mobile: horizontal scroll skeleton */}
          <div className="flex gap-3 overflow-hidden sm:hidden">
            {[0, 1, 2].map(i => (
              <div key={i} className="shrink-0 w-40 h-28 rounded-xl bg-idm-gold-warm/5 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
          {/* Desktop: grid skeleton */}
          <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-28 rounded-xl bg-idm-gold-warm/5 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      aria-label="Didukung Oleh"
      className="section-reveal relative py-10 sm:py-16 overflow-hidden bg-deep"
    >
      {/* ── Top edge glow ── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,168,83,0.25)] to-transparent" aria-hidden="true" />

      {/* ── Background ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(212,168,83,0.05) 0%, transparent 60%)' }} />

      {/* ── Bottom edge glow ── */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,168,83,0.15)] to-transparent" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <SectionHeader
          icon={Gem}
          label="Didukung Oleh"
          title="Sponsor & Partner"
          subtitle="Mendukung ekosistem Tarkam IDM"
        />

        {/* ── Mobile: Horizontal scroll carousel ── */}
        <div className="sm:hidden">
          <div className="flex gap-3 overflow-x-auto px-4 pb-4 snap-x snap-mandatory no-scrollbar -mx-4">
            {sponsors.map(sponsor => (
              <SponsorCardMobile key={sponsor.id} sponsor={sponsor} />
            ))}
          </div>
          {/* Scroll indicator dots */}
          {sponsors.length > 3 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {sponsors.map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-idm-gold-warm/25" />
              ))}
            </div>
          )}
        </div>

        {/* ── Desktop: Grid layout ── */}
        <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4">
          {sponsors.map(sponsor => (
            <SponsorCardDesktop key={sponsor.id} sponsor={sponsor} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Mobile Card — Larger, premium look with name overlay ── */
function SponsorCardMobile({ sponsor }: { sponsor: Sponsor }) {
  const logo = sponsor.logo;
  const inner = (
    <div className="group relative shrink-0 w-36 h-28 rounded-2xl border border-idm-gold-warm/20 overflow-hidden transition-all duration-300 active:scale-[0.97] bg-idm-gold-warm/[0.04] snap-start">
      {logo ? (
        <>
          <Image
            src={logo}
            alt={sponsor.name}
            fill
            sizes="144px"
            className="object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-300"
            style={{ objectPosition: 'center 30%' }}
          />
          {/* Name overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-6 pb-2 px-2">
            <span className="text-[10px] font-bold text-white/90 truncate block text-center">
              {sponsor.name}
            </span>
          </div>
        </>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-idm-gold-warm/80 text-center px-3">
          {sponsor.name}
        </span>
      )}
    </div>
  );

  if (sponsor.website) {
    return (
      <a
        href={sponsor.website}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${sponsor.name}`}
      >
        {inner}
      </a>
    );
  }

  return inner;
}

/* ── Desktop Card ── */
function SponsorCardDesktop({ sponsor }: { sponsor: Sponsor }) {
  const logo = sponsor.logo;
  const inner = (
    <div className="group relative rounded-xl border border-idm-gold-warm/15 bg-idm-gold-warm/[0.04] h-28 overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(212,168,83,0.12)]">
      {logo ? (
        <>
          <Image
            src={logo}
            alt={sponsor.name}
            fill
            sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
            className="object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
            style={{ objectPosition: 'center 30%' }}
          />
          {/* Name overlay on hover */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent h-1/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end pb-1.5 px-2">
            <span className="text-[10px] font-semibold text-white/90 truncate">
              {sponsor.name}
            </span>
          </div>
        </>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs sm:text-sm font-semibold text-idm-gold-warm/70 group-hover:text-idm-gold-warm transition-colors text-center px-2">
          {sponsor.name}
        </span>
      )}
    </div>
  );

  if (sponsor.website) {
    return (
      <a
        href={sponsor.website}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${sponsor.name}`}
      >
        {inner}
      </a>
    );
  }

  return <div>{inner}</div>;
}
