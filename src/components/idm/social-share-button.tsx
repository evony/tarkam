'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Share2, Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

/* -------------------------------------------------------------------------- */
/*  SharePopup — generic social share popup for any content type              */
/* -------------------------------------------------------------------------- */

interface SharePopupProps {
  /** The URL to share */
  shareUrl: string;
  /** Title shown in the popup header, e.g. "Bagikan Profil" or "Bagikan Bracket" */
  title: string;
  /** Subtitle shown below title, e.g. "Profil PlayerX" or "Bracket Male Division" */
  subtitle?: React.ReactNode;
  /** The text to include in share messages */
  shareText: string;
  /** Label for the trigger button aria-label and title */
  buttonLabel?: string;
  /** Size variant: 'sm' for inline compact, 'md' for default */
  size?: 'sm' | 'md';
  /** Additional CSS classes for the trigger button */
  className?: string;
}

function WhatsAppIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function FacebookIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function InstagramIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function TwitterIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

export function SharePopup({
  shareUrl,
  title,
  subtitle,
  shareText,
  buttonLabel = 'Bagikan',
  size = 'md',
  className = '',
}: SharePopupProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const isSm = size === 'sm';

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return false;
    try {
      await navigator.share({
        title,
        text: shareText,
        url: shareUrl,
      });
      setShowPicker(false);
      return true;
    } catch {
      return false;
    }
  }, [title, shareUrl, shareText]);

  const handleClick = useCallback(() => {
    setShowPicker(prev => !prev);
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => { setCopied(false); setShowPicker(false); }, 1500);
    } catch {
      // Fallback: textarea copy
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => { setCopied(false); setShowPicker(false); }, 1500);
    }
  }, [shareUrl]);

  // Copy link + close picker after sharing
  const handleInstagramClick = useCallback(() => {
    // Instagram has no direct share URL — copy link first, then open Instagram
    navigator.clipboard.writeText(shareUrl).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Close picker after a short delay so user sees "Link Tersalin!" feedback
    setTimeout(() => setShowPicker(false), 600);
  }, [shareUrl]);

  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: <WhatsAppIcon className="w-5 h-5" />,
      color: 'bg-[#25D366] hover:bg-[#20BD5A]',
      href: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      isInstagram: false,
    },
    {
      name: 'Facebook',
      icon: <FacebookIcon className="w-5 h-5" />,
      color: 'bg-[#1877F2] hover:bg-[#1565D8]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
      isInstagram: false,
    },
    {
      name: 'Instagram',
      icon: <InstagramIcon className="w-5 h-5" />,
      color: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90',
      href: 'https://www.instagram.com/',
      isInstagram: true,
    },
    {
      name: 'X / Twitter',
      icon: <TwitterIcon className="w-5 h-5" />,
      color: 'bg-foreground hover:bg-foreground/80',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      isInstagram: false,
    },
  ];

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={handleClick}
        className={`inline-flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer ${
          isSm ? 'w-7 h-7' : 'w-9 h-9'
        } ${
          copied
            ? 'bg-green-500/15 text-green-400'
            : showPicker
            ? 'bg-idm-gold-warm/20 text-idm-gold-warm'
            : 'bg-idm-gold-warm/10 text-idm-gold-warm/80 hover:text-idm-gold-warm hover:bg-idm-gold-warm/20'
        } ${className}`}
        title={buttonLabel}
        aria-label={buttonLabel}
        aria-expanded={showPicker}
      >
        {copied ? (
          <Check className={isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        ) : (
          <Share2 className={isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        )}
      </button>

      {/* Social Media Picker Popup */}
      {showPicker && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
            onClick={() => setShowPicker(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Picker Card */}
            <motion.div
              className="relative z-10 w-full max-w-xs mx-4 mb-4 sm:mb-0 rounded-2xl border border-idm-gold-warm/15 bg-background/98 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-idm-gold-warm/10 bg-idm-gold-warm/[0.03]">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-idm-gold-warm" />
                  <span className="text-sm font-bold text-foreground">{title}</span>
                </div>
                <button
                  onClick={() => setShowPicker(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Subtitle */}
              {subtitle && (
                <div className="px-4 pt-3 pb-2">
                  <p className="text-xs text-muted-foreground">
                    {subtitle}
                  </p>
                </div>
              )}

              {/* Social buttons grid — using <a> tags for reliable link opening (no popup blocker issues) */}
              <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                {socialLinks.map(s => (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={s.isInstagram ? (e) => { e.preventDefault(); handleInstagramClick(); } : () => setShowPicker(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-white text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer no-underline ${s.color}`}
                  >
                    {s.icon}
                    <span>{s.name}</span>
                  </a>
                ))}
              </div>

              {/* Copy link */}
              <div className="px-4 pb-3">
                <button
                  onClick={copyLink}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer ${
                    copied
                      ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-border/40'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Link Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      <span>Salin Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* More apps via native share — only on mobile where navigator.share exists */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <div className="px-4 pb-4">
                  <button
                    onClick={async () => {
                      await handleNativeShare();
                      setShowPicker(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer bg-idm-gold-warm/10 text-idm-gold-warm hover:bg-idm-gold-warm/20 border border-idm-gold-warm/15"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Lainnya...</span>
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  SocialShareButton — backward-compatible player-profile wrapper             */
/* -------------------------------------------------------------------------- */

interface SocialShareButtonProps {
  playerGamertag: string;
  playerId: string;
  className?: string;
}

/**
 * Social share button for player profiles.
 * Backward-compatible wrapper around SharePopup.
 */
export function SocialShareButton({ playerGamertag, playerId, className }: SocialShareButtonProps) {
  const playerUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?player=${encodeURIComponent(playerId)}`
    : '';

  const shareText = `Lihat profil ${playerGamertag} di Tarkam IDM!`;

  return (
    <SharePopup
      shareUrl={playerUrl}
      title="Bagikan Profil"
      subtitle={<>Profil <span className="font-semibold text-idm-gold-warm">{playerGamertag}</span></>}
      shareText={shareText}
      buttonLabel="Bagikan profil"
      size="md"
      className={className}
    />
  );
}
