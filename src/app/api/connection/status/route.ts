import { NextRequest, NextResponse } from 'next/server';
import { getSession, refreshGoogleTokensIfNeeded } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let session = await getSession(request);
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        database: null,
        isDevMode: false,
      });
    }

    session = await refreshGoogleTokensIfNeeded(session);

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      database: session.database || null,
      isDevMode: !!session.isDevMode,
    });
  } catch (error: unknown) {
    console.error('[Connection Status Error]:', error);
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Failed to check connection status'
        : (error instanceof Error ? error.message : 'Failed to check connection status');
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        database: null,
        isDevMode: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
