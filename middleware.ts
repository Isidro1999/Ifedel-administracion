import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware sin lógica de auth para evitar bucles en Edge.
 * La protección se hace en AuthGuard (layout) en el servidor.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
