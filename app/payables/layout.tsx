import { requireApprovedPage } from '@/lib/session-auth'

export default async function PayablesSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedPage()
  return children
}
