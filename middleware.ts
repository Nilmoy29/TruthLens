import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') || '*'

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      const res = new NextResponse(null, { status: 204 })
      res.headers.set('Access-Control-Allow-Origin', origin)
      res.headers.set('Vary', 'Origin')
      res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.headers.set('Access-Control-Max-Age', '86400')
      return res
    }

    // Add CORS headers to actual responses
    const res = NextResponse.next()
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Vary', 'Origin')
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res
  }

  // Authentication and route protection
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/profile', '/history', '/settings', '/admin']
  const authRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password']
  
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect to dashboard if accessing auth routes with active session
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    
    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}