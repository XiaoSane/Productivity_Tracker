import { NextRequest, NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const host = req.headers.get('host');

    // CSRF Defense: verify that Origin or Referer matches the host
    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: cross-origin request rejected' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: 'Forbidden: invalid origin header' },
          { status: 403 }
        );
      }
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.host !== host) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: cross-origin request rejected' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: 'Forbidden: invalid referer header' },
          { status: 403 }
        );
      }
    }

    await clearSession();
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[Logout API Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log out' },
      { status: 500 }
    );
  }
}
