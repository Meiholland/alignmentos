import { NextRequest } from 'next/server'

/**
 * Get the app's base URL (e.g. https://alignmentos.vercel.app or http://localhost:3000).
 * Uses the request host when available (so production links use the real domain),
 * otherwise falls back to NEXT_PUBLIC_APP_URL or localhost.
 */
export function getAppBaseUrl(request?: NextRequest | null): string {
  if (request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const proto = forwardedProto || (host?.includes('localhost') ? 'http' : 'https')
    if (host) {
      return `${proto === 'https' ? 'https' : 'http'}://${host}`
    }
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}
