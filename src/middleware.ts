import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════
// IDM LEAGUE — MIDDLEWARE (Vercel Free Tier Optimized)
// ═══════════════════════════════════════════════════════════
// Previous version: empty pass-through on ALL /api/* requests.
// That wasted ~5-15ms per API call on Vercel serverless.
//
// Now: Rate limiting on mutation endpoints (POST/PUT/DELETE/PATCH)
// to protect free tier from abuse. GET requests are not matched
// to avoid unnecessary function invocations.
// ═══════════════════════════════════════════════════════════

// Simple in-memory rate limiter (per Vercel function instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // 30 requests
const RATE_WINDOW = 60_000; // per 60 seconds

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  // Only rate-limit mutation requests (POST/PUT/DELETE/PATCH)
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return NextResponse.next();
  }

  // ── CSRF Protection: Validate Origin header ──
  // For mutation requests, ensure the Origin matches our own domain.
  // This prevents cross-site form submissions (CSRF).
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json(
          { error: 'Forbidden — invalid origin' },
          { status: 403 }
        );
      }
    } catch {
      // Malformed origin — reject
      return NextResponse.json(
        { error: 'Forbidden — malformed origin' },
        { status: 403 }
      );
    }
  }

  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

export const config = {
  // Only match mutation API endpoints (not GET) to avoid
  // unnecessary function invocations on read requests
  matcher: [
    '/api/tournaments/:path*',
    '/api/players/:path*',
    '/api/clubs/:path*',
    '/api/seasons/:path*',
    '/api/matches/:path*',
    '/api/donations/:path*',
    '/api/admin/:path*',
    '/api/auth/:path*',
    '/api/account/:path*',
    '/api/cms/:path*',
    '/api/marketplace/:path*',
    '/api/sponsors/:path*',
    '/api/skins/:path*',
    '/api/whatsapp/:path*',
    '/api/seed/:path*',
    '/api/setup/:path*',
    '/api/reset/:path*',
    '/api/sync/:path*',
  ],
};
