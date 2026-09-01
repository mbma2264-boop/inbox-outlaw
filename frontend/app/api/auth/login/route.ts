import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', 'Email-only sign-in has been disabled. Use Continue with Google.');
  return NextResponse.redirect(url, { status: 303 });
}
