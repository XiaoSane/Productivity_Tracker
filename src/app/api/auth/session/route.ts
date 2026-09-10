import { NextResponse } from 'next/server';
import { getSession, refreshGoogleTokensIfNeeded } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let session = await getSession();
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        database: null,
        isDevMode: false,
      });
    }

    // Attempt token refresh if close to expiry
    session = await refreshGoogleTokensIfNeeded(session);

    // Return sanitized session data (tokens stripped)
    return NextResponse.json({
      authenticated: true,
      user: session.user,
      database: session.database || null,
      isDevMode: !!session.isDevMode,
    });
  } catch (error) {
    console.error('[Session API Error]:', error);
    return NextResponse.json({
      authenticated: false,
      user: null,
      database: null,
      isDevMode: false,
      error: 'Failed to retrieve session',
    }, { status: 500 });
  }
}
