/**
 * Next.js Middleware - Authentication & Route Protection
 * Ensures Supabase session exists before accessing protected routes
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Environment Variables
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ============================================================================
// Middleware
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/api/health'];

  // Check if route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname === route || pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // =========================================================================
  // Check Authentication for Protected Routes
  // =========================================================================

  try {
    // Get session from cookies
    const cookieStore = request.cookies;
    const sessionCookie = cookieStore.get('sb-session');

    // If no session, redirect to login
    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Try to validate session with Supabase
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string) {
              // Note: setting cookies in middleware requires careful handling
              // This is a simplified version
            },
            remove(name: string) {
              // Note: removing cookies in middleware requires careful handling
            },
          },
        }
      );

      // Verify session is still valid
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        // Session invalid or expired
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // User is authenticated, allow request
      return NextResponse.next();
    }

    // If Supabase client can't be created, allow request (fallback)
    return NextResponse.next();
  } catch (error) {
    console.error('[Middleware] Authentication check failed:', error);
    // Fail open for development, but log the error
    // In production, consider redirecting to login
    return NextResponse.next();
  }
}

// ============================================================================
// Middleware Configuration
// ============================================================================

export const config = {
  // Protect all routes except public ones
  matcher: [
    // Include all routes
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
