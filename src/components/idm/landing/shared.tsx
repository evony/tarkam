'use client';

import { useRef, useEffect, useState, type ReactNode } from 'react';

/* ========== Swipe Navigation Hook (DISABLED) ========== */
export function useSwipeNavigation() {
  // Intentionally empty — users scroll freely; bottom nav provides quick section navigation.
}

/* ========== Lightweight Parallax Hook ==========
  Drives `transform: translate3d(0, Ypx, 0)` on cached elements via rAF.
  No Framer Motion — pure CSS + requestAnimationFrame for mid-range devices.

  Key optimizations over naive approach:
  - Element references are CACHED once (no querySelectorAll per frame!)
  - Layers are stabilized via useMemo (no re-subscribe cascade)
  - Single rAF loop with double-buffered scrollY (no layout thrash)
  - GPU-only properties: will-change + contain + translate3d
  - Movement capped ±300px for safety
*/
interface ParallaxLayer {
  selector: string;
  speed: number;
}

interface CachedLayer {
  speed: number;
  els: HTMLElement[];
}

export function useParallax(layers: ParallaxLayer[]) {
  const rafRef = useRef<number>(0);
  const cacheRef = useRef<CachedLayer[]>([]);
  const scrollYRef = useRef(0);
  const lastAppliedRef = useRef(0); // Track last applied scroll to skip no-op frames

  // Stabilize layers with a key-based comparison to avoid re-subscribe cascade
  const layersKey = layers.map(l => `${l.selector}:${l.speed}`).join('|');
  const [stableLayers] = useState(() => layers.map(l => ({ selector: l.selector, speed: l.speed })));

  useEffect(() => {
    // ── Step 1: Cache all element references ONCE ──
    const cached: CachedLayer[] = stableLayers.map(layer => ({
      speed: layer.speed,
      els: Array.from(document.querySelectorAll<HTMLElement>(layer.selector)),
    }));
    cacheRef.current = cached;

    // Apply GPU hints once
    for (const c of cached) {
      for (const el of c.els) {
        el.style.willChange = 'transform';
        el.style.contain = 'layout style';
      }
    }

    // ── Step 2: Single rAF loop — reads scrollY, writes transforms ──
    const tick = () => {
      rafRef.current = 0;
      const scrollY = scrollYRef.current;

      // Skip if scroll hasn't changed since last apply
      if (scrollY === lastAppliedRef.current) return;
      lastAppliedRef.current = scrollY;

      for (const c of cacheRef.current) {
        const offset = Math.max(-300, Math.min(300, scrollY * c.speed));
        const transform = `translate3d(0,${offset}px,0)`;
        for (const el of c.els) {
          el.style.transform = transform;
        }
      }
    };

    const onScroll = () => {
      scrollYRef.current = window.scrollY;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial position

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [stableLayers]);
}

/* ========== Parallax Background Component ==========
  Wraps children in a parallax-enabled container.
  Uses cached element ref — no DOM query per frame.
*/
export function ParallaxBg({ children, className = '', speed = 0.12 }: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const scrollYRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.willChange = 'transform';
    el.style.contain = 'layout style';

    // Cache element's initial document-top position (doesn't change on scroll)
    const docTop = el.getBoundingClientRect().top + window.scrollY;

    const tick = () => {
      rafRef.current = 0;
      const scrollY = scrollYRef.current;
      // Offset based on how far element is from viewport center
      const offset = Math.max(-200, Math.min(200, (scrollY - docTop) * speed));
      el.style.transform = `translate3d(0,${offset}px,0)`;
    };

    const onScroll = () => {
      scrollYRef.current = window.scrollY;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [speed]);

  return (
    <div ref={ref} className={`parallax-bg ${className}`}>
      {children}
    </div>
  );
}

/* ========== Scroll Reveal Hook ==========
  Observes all `.reveal:not(.reveal--visible)` and `.section-reveal:not(.section-reveal--visible)`
  elements and adds their respective visible class when they scroll into view.
  Uses a single persistent IntersectionObserver — NO MutationObserver.

  INP optimization: Removed MutationObserver on document.body which fired on
  every DOM change. Instead, we observe elements once on mount. For dynamically
  added elements (after data loads), they will be picked up when the section
  components re-render and their wrapper divs already have the CSS class.
*/
export function useScrollReveal() {
  useEffect(() => {
    // Create a single IntersectionObserver for all reveal elements
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target.classList.contains('section-reveal')) {
              entry.target.classList.add('section-reveal--visible');
            } else {
              entry.target.classList.add('reveal--visible');
            }
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px', threshold: 0.01 }
    );

    // Helper: observe all un-revealed elements
    const observeAll = () => {
      document.querySelectorAll('.reveal:not(.reveal--visible)').forEach((el) => {
        io.observe(el);
      });
      document.querySelectorAll('.section-reveal:not(.section-reveal--visible)').forEach((el) => {
        io.observe(el);
      });
    };

    // Observe all existing elements on mount
    observeAll();

    // ★ INP OPTIMIZATION: Replace MutationObserver (which fires on every DOM change
    // and blocks the main thread during interactions) with lightweight idle-time polling.
    // Runs 4 scans over ~3 seconds to catch dynamically-loaded components, then stops.
    // This eliminates the constant DOM mutation monitoring that was the #1 INP killer.
    let scanCount = 0;
    let idleHandle: ReturnType<typeof requestIdleCallback> | null = null;

    const scanOnIdle = () => {
      if (scanCount >= 4) return;
      scanCount++;
      observeAll();
      // Schedule next scan during idle time
      if (typeof requestIdleCallback !== 'undefined') {
        idleHandle = requestIdleCallback(scanOnIdle, { timeout: 1500 });
      } else {
        setTimeout(scanOnIdle, 1000);
      }
    };

    // Start scanning after a brief delay (let initial render settle)
    if (typeof requestIdleCallback !== 'undefined') {
      idleHandle = requestIdleCallback(scanOnIdle, { timeout: 1000 });
    } else {
      setTimeout(scanOnIdle, 500);
    }

    return () => {
      io.disconnect();
      if (idleHandle !== null && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleHandle);
      }
    };
  }, []);
}

/* ========== Scroll-triggered Section Wrapper (CSS-only, Enhanced) ==========
  Premium reveal animation with blur-from + scale + opacity transition.
  Uses IntersectionObserver to add `.reveal--visible`, triggering a
  spring-like CSS transition (cubic-bezier spring approximation).
  All GPU-only: transform, opacity, filter — no layout thrash.
*/
export function AnimatedSection({ children, className = '', variant = 'fadeUp' }: {
  children: ReactNode;
  className?: string;
  variant?: 'fadeUp' | 'fadeLeft' | 'fadeRight' | 'scaleIn' | 'premium';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px', threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const variantClass = {
    fadeUp: 'reveal-fade-up',
    fadeLeft: 'reveal-fade-left',
    fadeRight: 'reveal-fade-right',
    scaleIn: 'reveal-scale-in',
    premium: 'reveal-premium',
  }[variant] || 'reveal-fade-up';

  return (
    <div ref={ref} className={`reveal ${variantClass} ${className}`}>
      {children}
    </div>
  );
}

/* ========== Section Header Component (Enhanced Premium) ==========
  Premium section header with:
  - Animated gold shimmer gradient line above the title
  - Pill/badge label with subtle glow
  - Better vertical spacing between label → shimmer → title → subtitle
  - Uses text-gradient-animated for the title if available
*/
export function SectionHeader({ icon: Icon, label, title, subtitle }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-12 sm:mb-16">
      {/* Label pill with glow */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent to-idm-gold-warm/60" />
        <div className="section-header-label flex items-center gap-2 px-4 py-1.5 rounded-full border border-idm-gold-warm/25 bg-idm-gold-warm/[0.07]">
          <Icon className="w-4 h-4 text-idm-gold-warm" />
          <span className="text-[11px] font-bold text-idm-gold-warm uppercase tracking-widest">{label}</span>
        </div>
        <div className="h-px w-12 sm:w-20 bg-gradient-to-l from-transparent to-idm-gold-warm/60" />
      </div>

      {/* Animated gold shimmer line above title */}
      <div className="section-header-shimmer-line mx-auto mb-6" aria-hidden="true" />

      {/* Title with animated gradient */}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gradient-animated">{title}</h2>

      {/* Subtitle with improved spacing */}
      {subtitle && (
        <p className="text-sm sm:text-[15px] text-muted-foreground mt-5 max-w-lg mx-auto leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

/* ========== Stat Card (CSS-only animation) ========== */
export function StatCard({ icon: Icon, value, label, delay }: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  delay: number;
}) {
  const numericMatch = value.match(/^(\d+)/);
  const numericValue = numericMatch ? parseInt(numericMatch[1], 10) : 0;
  const suffix = numericMatch ? value.slice(numericMatch[0].length) : value;
  const isNumeric = numericMatch !== null && numericValue > 0;

  const delayClass = delay <= 0.08 ? 'reveal-delay-1' : delay <= 0.16 ? 'reveal-delay-2' : delay <= 0.24 ? 'reveal-delay-3' : delay <= 0.32 ? 'reveal-delay-4' : 'reveal-delay-5';

  return (
    <div className={`reveal reveal-fade-up ${delayClass} group relative`}>
      <div className="relative p-4 sm:p-6 rounded-2xl sm:rounded-2xl border border-idm-gold-warm/10 bg-white/[0.06] text-center transition-all duration-300 hover:shadow-[0_0_30px_rgba(239,249,35,0.15)] hover:border-idm-gold-warm/20">
        <div className="absolute inset-0 rounded-2xl sm:rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/[0.04] to-transparent" />
        </div>
        <div className="relative z-10">
          <div className="w-7 h-7 sm:w-10 sm:h-10 mx-auto mb-1.5 sm:mb-3 rounded-lg sm:rounded-2xl bg-idm-gold-warm/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-idm-gold-warm" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-gradient-fury">
            {isNumeric ? (
              <span
                className="stat-count-up inline-block"
                style={{ '--count-target': numericValue } as React.CSSProperties}
                data-suffix={suffix}
              >
                {numericValue}{suffix}
              </span>
            ) : (
              value
            )}
          </p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* ========== Premium Section Divider (Enhanced v2) ==========
  Animated gradient line divider with:
  - Pulsing gradient lines (gold shimmer sweep)
  - Glowing central diamond orb with enhanced shimmer
  - Ambient glow that breathes
  - Floating particle dots
  - CSS-only animations — no JS animation libraries.
*/
export function SectionDivider() {
  return (
    <div className="section-divider-premium max-w-4xl mx-auto" aria-hidden="true">
      {/* Left gradient line — pulsing */}
      <span className="sdp-line sdp-line-l">
        <span className="sdp-line-shimmer" />
      </span>
      {/* Center orb group */}
      <span className="sdp-center">
        <span className="sdp-orb" />
        <span className="sdp-glow" />
        <span className="sdp-dot sdp-dot-1" />
        <span className="sdp-dot sdp-dot-2" />
        <span className="sdp-dot sdp-dot-3" />
      </span>
      {/* Right gradient line — pulsing */}
      <span className="sdp-line sdp-line-r">
        <span className="sdp-line-shimmer" />
      </span>
    </div>
  );
}

/* ========== Backward-compatible exports (empty, no longer needed) ========== */
export const fadeUp = {};
export const fadeLeft = {};
export const fadeRight = {};
export const scaleIn = {};
export const stagger = {};
