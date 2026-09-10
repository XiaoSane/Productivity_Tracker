import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  setSession,
  clearSession,
  refreshGoogleTokensIfNeeded,
} from '@/lib/auth/session';
import {
  findOrCreateDatabase,
  getStore,
  ALL_SHEET_NAMES,
} from '@/lib/server/sheetsEngine';
import { clampStr } from '@/lib/server/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    // CSRF defense: ensure request originates from the same host
    if (origin) {
      try {
        if (new URL(origin).host !== host) {
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
        if (new URL(referer).host !== host) {
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

    let session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated. Please connect Google first.' },
        { status: 401 }
      );
    }

    session = await refreshGoogleTokensIfNeeded(session);

    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
      }
    } catch {}

    const step = typeof body.step === 'string' ? body.step : '';

    switch (step) {
      case 'create_database': {
        // Find existing database or create new spreadsheet in Google Drive
        const db = await findOrCreateDatabase(session);
        session.database = {
          spreadsheetId: db.spreadsheetId,
          name: db.name,
          status: 'setup_required',
          sheetsReady: false,
          profileReady: false,
        };
        await setSession(session);
        return NextResponse.json({
          success: true,
          database: session.database,
          url: db.url,
        });
      }

      case 'init_sheets': {
        if (!session.database?.spreadsheetId) {
          return NextResponse.json(
            { success: false, error: 'Database spreadsheet not created yet.' },
            { status: 400 }
          );
        }
        const store = getStore(session);
        const result = await store.initializeAllSheets();
        session.database.sheetsReady = true;
        await setSession(session);
        return NextResponse.json({
          success: true,
          sheets: ALL_SHEET_NAMES,
          result,
        });
      }

      case 'save_profile': {
        const candidateName = clampStr(
          typeof body.candidateName === 'string' ? body.candidateName : '',
          100
        );
        if (!candidateName) {
          return NextResponse.json(
            { success: false, error: 'Candidate name is required.' },
            { status: 400 }
          );
        }

        const store = getStore(session);
        // Write profile key
        const profiles = await store.readRecords('Profile');
        const existing = profiles.find((p) => p.key === 'candidateName');
        if (existing) {
          await store.updateRecord('Profile', 'candidateName', { value: candidateName }, 'key');
        } else {
          await store.appendRecord('Profile', {
            key: 'candidateName',
            value: candidateName,
            updatedAt: new Date().toISOString(),
          });
        }

        if (session.database) {
          session.database.profileReady = true;
          session.database.status = 'connected';
        }
        await setSession(session);

        return NextResponse.json({
          success: true,
          candidateName,
          database: session.database,
        });
      }

      case 'disconnect': {
        // Safe disconnect: clears local encrypted session cookie
        // Never deletes user data from Google Drive / Sheets
        await clearSession();
        return NextResponse.json({
          success: true,
          message: 'Disconnected successfully. Your data in Google Drive remains safe.',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown setup step: "${step}".` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('[Connection Setup Error]:', error);
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Setup step failed. Please try again.'
        : (error instanceof Error ? error.message : 'Setup step failed.');
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
