'use client';

import React from 'react';
import { Heart, Flame } from 'lucide-react';
import { AnimatedSection, SectionHeader } from './shared';

interface AboutSectionProps {
  cmsSections: Record<string, any>;
  cmsSettings: Record<string, string>;
}

export function AboutSection({ cmsSections, cmsSettings }: AboutSectionProps) {
  // CMS data with fallbacks
  const aboutSection = cmsSections.about;
  const sectionTitle = aboutSection?.title || 'Dari Pemain, Untuk Pemain';
  const sectionSubtitle = aboutSection?.subtitle || 'Cerita Kami';
  const sectionDescription = aboutSection?.description || 'Bagaimana Tarkam IDM lahir dari semangat komunitas yang tidak ingin gamenya sepi';

  // Origin story text
  const originStory = cmsSettings.about_origin_story || 'Idol Meta dari Lyto Game — sebuah rhythm game yang menghidupkan panggung virtual. Dari komunitas pemain yang tidak ingin gamenya mati, Tarkam IDM lahir — bukan dari perusahaan, bukan dari sponsor besar, tapi dari semangat Tarkam.';

  // Bottom tagline
  const bottomTagline = cmsSettings.about_tagline || 'By Players, For Players';

  // Parse origin story — take just the first paragraph for brevity
  const firstParagraph = originStory.split('\n\n')[0];

  // Highlight key words safely (no dangerouslySetInnerHTML)
  function highlightText(text: string): React.ReactNode[] {
    const keywords = ['Idol Meta', 'Tarkam IDM', 'Tarkam'];
    let parts: React.ReactNode[] = [text];

    for (const keyword of keywords) {
      const newParts: React.ReactNode[] = [];
      for (const part of parts) {
        if (typeof part !== 'string') {
          newParts.push(part);
          continue;
        }
        const segments = part.split(keyword);
        segments.forEach((segment, i) => {
          if (segment) newParts.push(segment);
          if (i < segments.length - 1) {
            newParts.push(<span key={`${keyword}-${i}`} className="text-idm-gold-warm font-semibold">{keyword}</span>);
          }
        });
      }
      parts = newParts;
    }

    return parts;
  }

  return (
    <section id="about" role="region" aria-label="Cerita Kami" className="relative py-12 sm:py-16 px-4 overflow-hidden bg-deep">
      {/* Background — subtle warm glow */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, color-mix(in srgb, var(--color-idm-gold-warm) 4%, transparent) 0%, transparent 50%)' }} />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <AnimatedSection>
          {/* Simple centered text block with gold accents */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-idm-gold-warm/40" />
            <Flame className="w-3.5 h-3.5 text-idm-gold-warm/60" />
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-idm-gold-warm/40" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-idm-gold-warm mb-3">{sectionTitle}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">{highlightText(firstParagraph)}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-idm-gold-warm/20" />
            <span className="text-[10px] font-bold text-idm-gold-warm/40 uppercase tracking-widest">{bottomTagline}</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-idm-gold-warm/20" />
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
