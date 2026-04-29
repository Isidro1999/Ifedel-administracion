import { NextRequest } from 'next/server'

export function verifyAdminKey(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key')
  const expectedKey = process.env.ADMIN_KEY

  if (!expectedKey) {
    console.error('ADMIN_KEY no está configurada en las variables de entorno')
    return false
  }

  return adminKey === expectedKey
}

export function unauthorizedResponse() {
  return Response.json(
    { error: 'No autorizado. Se requiere header x-admin-key válido.' },
    { status: 401 }
  )
}

export async function requireAdminKey(adminKey?: string): Promise<boolean> {
  const expectedKey = process.env.ADMIN_KEY
  if (!expectedKey) {
    console.error('ADMIN_KEY no está configurada en las variables de entorno')
    return false
  }
  return adminKey === expectedKey
}
