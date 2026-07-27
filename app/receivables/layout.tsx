import { requireApprovedPage } from '@/lib/session-auth'

export default async function ReceivablesSegmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireApprovedPage()
  return children
}
