import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isDevParam = searchParams.get('dev') === 'true';

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const rawReturnTo = searchParams.get('returnTo');
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//')
      ? rawReturnTo
      : '/settings?setup=1';

  const isProduction = process.env.NODE_ENV === 'production';

  // Strict check: Dev mode is ONLY permitted in development environments
  const isDevModeAllowed = !isProduction && (isDevParam || !clientId || !clientSecret);

  if (isDevModeAllowed) {
    const devCallbackUrl = new URL('/api/auth/callback', appUrl);
    devCallbackUrl.searchParams.set('dev', 'true');
    devCallbackUrl.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(devCallbackUrl.toString());
  }

  // In production, missing credentials must fail with a descriptive error
  if (!clientId || !clientSecret) {
    console.error('[Google OAuth]: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in production.');
    const errUrl = new URL('/settings', appUrl);
    errUrl.searchParams.set('error', 'Google OAuth credentials are not configured on the server.');
    return NextResponse.redirect(errUrl.toString());
  }

  // Generate cryptographic state for CSRF protection
  const state = crypto.randomBytes(24).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('self_tracker_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60, // 10 minutes
  });

  cookieStore.set('self_tracker_oauth_return_to', returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });

  const redirectUri = `${appUrl}/api/auth/callback`;

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set(
    'scope',
    'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets'
  );
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');
  googleAuthUrl.searchParams.set('state', state);

  return NextResponse.redirect(googleAuthUrl.toString());
}
