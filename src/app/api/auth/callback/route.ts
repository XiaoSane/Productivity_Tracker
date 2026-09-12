import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { setSession, SessionData } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const isDev = searchParams.get('dev') === 'true';

  const cookieStore = await cookies();
  const savedState = cookieStore.get('self_tracker_oauth_state')?.value;
  const rawReturnTo = searchParams.get('returnTo') || cookieStore.get('self_tracker_oauth_return_to')?.value;
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//')
      ? rawReturnTo
      : '/settings?setup=1';

  // Clean up transient oauth cookies
  cookieStore.delete('self_tracker_oauth_state');
  cookieStore.delete('self_tracker_oauth_return_to');

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const KNOWN_OAUTH_ERRORS: Record<string, string> = {
    access_denied: 'Access was denied by the user.',
    unauthorized_client: 'The client is not authorized to request an authorization code.',
    invalid_request: 'The authorization request is invalid or missing required parameters.',
    unsupported_response_type: 'The authorization server does not support this response type.',
    invalid_scope: 'The requested scope is invalid, unknown, or malformed.',
    server_error: 'Google authorization server encountered an unexpected condition.',
    temporarily_unavailable: 'Google authorization server is temporarily unavailable.',
  };

  // Handle errors from Google OAuth
  if (error) {
    console.error('[Google OAuth Callback Error]:', error);
    const safeErrorDesc = KNOWN_OAUTH_ERRORS[error] || 'Google authorization could not be completed.';
    const errUrl = new URL(returnTo, appUrl);
    errUrl.searchParams.set('error', safeErrorDesc);
    return NextResponse.redirect(errUrl.toString());
  }

  // Handle local development / demo mode
  if (isDev) {
    if (process.env.NODE_ENV === 'production') {
      const errUrl = new URL('/settings', appUrl);
      errUrl.searchParams.set('error', 'Development mode is disabled in production.');
      return NextResponse.redirect(errUrl.toString());
    }

    const devSession: SessionData = {
      user: {
        id: 'dev-user-001',
        email: 'prem.patil@example.com',
        name: 'Prem Patil',
      },
      tokens: {
        accessToken: 'dev-mock-access-token',
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      },
      database: {
        spreadsheetId: 'dev-spreadsheet-local',
        name: 'Productivity Tracker Database',
        status: 'setup_required',
      },
      isDevMode: true,
      createdAt: Date.now(),
    };

    await setSession(devSession);
    const redirectUrl = new URL(returnTo, appUrl);
    redirectUrl.searchParams.set('setup', '1');
    return NextResponse.redirect(redirectUrl.toString());
  }

  // Validate state for CSRF protection
  if (!state || !savedState || state !== savedState) {
    console.error('[Google OAuth State Mismatch]: Possible CSRF attack');
    const errUrl = new URL('/settings', appUrl);
    errUrl.searchParams.set('error', 'OAuth state verification failed. Please try connecting again.');
    return NextResponse.redirect(errUrl.toString());
  }

  if (!code) {
    const errUrl = new URL('/settings', appUrl);
    errUrl.searchParams.set('error', 'Missing authorization code from Google.');
    return NextResponse.redirect(errUrl.toString());
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = `${appUrl}/api/auth/callback`;

  if (!clientId || !clientSecret) {
    const errUrl = new URL('/settings', appUrl);
    errUrl.searchParams.set('error', 'Google Client credentials are not configured on server.');
    return NextResponse.redirect(errUrl.toString());
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenParams = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('[Token Exchange Failed]:', errBody);
      const errUrl = new URL('/settings', appUrl);
      errUrl.searchParams.set('error', 'Failed to exchange authorization code with Google.');
      return NextResponse.redirect(errUrl.toString());
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;

    // Verify required scopes: Drive and Sheets must be granted
    const rawScopes = (tokenData.scope || '').toLowerCase().split(' ');
    const hasDriveScope = rawScopes.some(
      (s: string) => s.includes('auth/drive.file') || s.includes('auth/drive')
    );
    const hasSheetsScope = rawScopes.some(
      (s: string) => s.includes('auth/spreadsheets')
    );

    if (!hasDriveScope || !hasSheetsScope) {
      console.warn('[Google OAuth Callback]: Incomplete scopes granted:', tokenData.scope);
      // Immediately revoke the incomplete token so Google doesn't keep stale permissions
      if (accessToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
        } catch (revErr) {
          console.warn('[Google OAuth]: Revoke failed:', revErr);
        }
      }
      const errUrl = new URL('/settings', appUrl);
      errUrl.searchParams.set(
        'error',
        'Google Drive and Sheets permissions are required. Please click Connect again and check Select All permissions.'
      );
      return NextResponse.redirect(errUrl.toString());
    }

    // 2. Fetch user profile from Google UserInfo
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      console.error('[Google UserInfo Failed]:', await userInfoRes.text());
      const errUrl = new URL('/settings', appUrl);
      errUrl.searchParams.set('error', 'Failed to retrieve user profile from Google.');
      return NextResponse.redirect(errUrl.toString());
    }

    const userInfo = await userInfoRes.json();

    // 3. Create encrypted session
    const sessionData: SessionData = {
      user: {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        picture: userInfo.picture,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
      },
      database: {
        spreadsheetId: '',
        name: 'Productivity Tracker Database',
        status: 'setup_required',
      },
      isDevMode: false,
      createdAt: Date.now(),
    };

    await setSession(sessionData);

    // Redirect to wizard
    const successUrl = new URL(returnTo, appUrl);
    successUrl.searchParams.set('setup', '1');
    return NextResponse.redirect(successUrl.toString());
  } catch (err) {
    console.error('[Google OAuth Exchange Exception]:', err);
    const errUrl = new URL('/settings', appUrl);
    errUrl.searchParams.set('error', 'Unexpected error occurred during Google sign in.');
    return NextResponse.redirect(errUrl.toString());
  }
}
