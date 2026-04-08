// Supabase auth session refresh — fully implemented in Task 2/3
// This matcher ensures the middleware runs on all routes except static assets
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
