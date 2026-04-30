export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: any) {
  const { handlers } = await import('@/auth')
  return handlers.GET(request as any)
}

export async function POST(request: any) {
  const { handlers } = await import('@/auth')
  return handlers.POST(request as any)
}
