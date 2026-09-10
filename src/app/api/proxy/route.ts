import { NextRequest, NextResponse } from 'next/server';
import { getSession, refreshGoogleTokensIfNeeded } from '@/lib/auth/session';
import { executeTrackerAction } from '@/lib/server/sheetsEngine';

export const dynamic = 'force-dynamic';

function formatProxyError(error: unknown, context: string): NextResponse {
  console.error(`[API Proxy ${context} Error]:`, error);
  const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  // Check for known client validation / not-found errors
  const isNotFound = /not found/i.test(msg);
  const isValidationError =
    /required/i.test(msg) ||
    /invalid/i.test(msg) ||
    /cannot be empty/i.test(msg) ||
    /unknown action/i.test(msg) ||
    /must use/i.test(msg) ||
    /maximum/i.test(msg);

  if (isNotFound) {
    return NextResponse.json(
      { success: false, error: { message: msg, code: 'NOT_FOUND' } },
      { status: 404 }
    );
  }

  if (isValidationError) {
    return NextResponse.json(
      { success: false, error: { message: msg, code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  // Internal or unexpected errors: Never leak raw error messages in production
  const safeMessage =
    process.env.NODE_ENV === 'development'
      ? msg || 'Internal server error occurred.'
      : 'An unexpected error occurred while processing your request.';

  return NextResponse.json(
    { success: false, error: { message: safeMessage, code: 'INTERNAL_ERROR' } },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  try {
    let session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Authentication required. Please connect your Google account.',
            code: 'UNAUTHENTICATED',
          },
        },
        { status: 401 }
      );
    }

    session = await refreshGoogleTokensIfNeeded(session);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'dashboard';

    const params: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (action !== 'health' && action !== 'setup') {
      if (!session.database || session.database.status !== 'connected') {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Database setup required. Please complete the Setup Wizard.',
              code: 'SETUP_REQUIRED',
            },
          },
          { status: 400 }
        );
      }
    }

    const data = await executeTrackerAction(session, action, params, {});
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return formatProxyError(error, 'GET');
  }
}

export async function POST(request: NextRequest) {
  try {
    let session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Authentication required. Please connect your Google account.',
            code: 'UNAUTHENTICATED',
          },
        },
        { status: 401 }
      );
    }

    session = await refreshGoogleTokensIfNeeded(session);

    let parsedBody: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        parsedBody = JSON.parse(text);
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Malformed JSON payload.' },
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action =
      typeof parsedBody.action === 'string'
        ? parsedBody.action
        : searchParams.get('action') || '';
    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'No action was specified.' },
        },
        { status: 400 }
      );
    }

    const bodyParams =
      typeof parsedBody.params === 'object' && parsedBody.params !== null
        ? (parsedBody.params as Record<string, unknown>)
        : {};
    const params: Record<string, unknown> = { ...bodyParams };
    searchParams.forEach((value, key) => {
      if (params[key] === undefined) {
        params[key] = value;
      }
    });

    const bodyData = parsedBody.data !== undefined ? parsedBody.data : parsedBody;

    if (action !== 'health' && action !== 'setup') {
      if (!session.database || session.database.status !== 'connected') {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Database setup required. Please complete the Setup Wizard.',
              code: 'SETUP_REQUIRED',
            },
          },
          { status: 400 }
        );
      }
    }

    const data = await executeTrackerAction(session, action, params, bodyData);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return formatProxyError(error, 'POST');
  }
}
