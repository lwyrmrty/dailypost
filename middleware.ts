import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for session token (NextAuth stores session in cookies)
  const sessionToken = request.cookies.get('authjs.session-token') || 
                       request.cookies.get('__Secure-authjs.session-token');
  const isLoggedIn = !!sessionToken;

  // Protected routes
  const protectedPaths = ['/dashboard', '/onboarding', '/chat', '/settings'];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));

  // Auth routes (login/signup) - redirect to dashboard if already logged in
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some(path => pathname.startsWith(path));

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPath && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/chat/:path*',
    '/settings/:path*',
    '/login',
    '/signup',
  ],
};
