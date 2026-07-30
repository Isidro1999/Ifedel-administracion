/**
 * Promueve un usuario existente a role ADMIN (y asegura status APPROVED).
 *
 * Uso:
 *   npx tsx scripts/promote-user-to-admin.ts ifedel.agro@gmail.com
 *   PROMOTE_ADMIN_EMAIL=ifedel.agro@gmail.com npx tsx scripts/promote-user-to-admin.ts
 *
 * Idempotente: si ya es ADMIN + APPROVED, no escribe cambios.
 * No imprime tokens ni secretos.
 *
 * Tras promover en producción, el usuario debe cerrar sesión y volver a
 * iniciar sesión con Google para que el JWT de Auth.js refresque role/status.
 */
import { PrismaClient } from '@prisma/client'

const ADMIN_ROLE = 'ADMIN'
const APPROVED_STATUS = 'APPROVED'

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

function resolveEmail(): string {
  const fromArg = process.argv[2]
  const fromEnv = process.env.PROMOTE_ADMIN_EMAIL
  const raw = fromArg || fromEnv
  if (!raw || !raw.trim()) {
    console.error(
      [
        'Error: falta el email.',
        'Uso:',
        '  npx tsx scripts/promote-user-to-admin.ts <email>',
        '  PROMOTE_ADMIN_EMAIL=<email> npx tsx scripts/promote-user-to-admin.ts',
      ].join('\n'),
    )
    process.exit(1)
  }
  return normalizeEmail(raw)
}

async function main() {
  const email = resolveEmail()
  const prisma = new PrismaClient()

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    })

    if (!user) {
      console.error(`Error: no existe un usuario con email "${email}".`)
      process.exit(1)
    }

    const previous = { role: user.role, status: user.status }
    const alreadyAdmin =
      user.role === ADMIN_ROLE && user.status === APPROVED_STATUS

    console.log('Usuario encontrado:')
    console.log(`  email:  ${user.email}`)
    console.log(`  name:   ${user.name ?? '(sin nombre)'}`)
    console.log(`  role:   ${previous.role}`)
    console.log(`  status: ${previous.status}`)

    if (alreadyAdmin) {
      console.log(
        `\nSin cambios: ya es ${ADMIN_ROLE} con status ${APPROVED_STATUS}.`,
      )
      return
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: ADMIN_ROLE,
        status: APPROVED_STATUS,
        ...(user.status !== APPROVED_STATUS
          ? { approvedAt: new Date() }
          : {}),
      },
      select: {
        email: true,
        role: true,
        status: true,
      },
    })

    console.log('\nPromoción aplicada:')
    console.log(`  role:   ${previous.role} → ${updated.role}`)
    console.log(`  status: ${previous.status} → ${updated.status}`)
    console.log(
      '\nImportante: el usuario debe cerrar sesión y volver a iniciar sesión',
    )
    console.log(
      'para que Auth.js refresque el JWT (role/status en la sesión).',
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Error inesperado al promover usuario:', err instanceof Error ? err.message : err)
  process.exit(1)
})
