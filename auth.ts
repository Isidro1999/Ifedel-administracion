import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAIL = 'isidroballestrin@gmail.com'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return false
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
      })
      if (!dbUser) return true
      if (dbUser.email === ADMIN_EMAIL) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { role: 'ADMIN', status: 'APPROVED' },
        })
      }
      return true
    },
    async jwt({ token, user: authUser }) {
      if (authUser?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: authUser.email },
          select: { id: true, role: true, status: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.status = dbUser.status
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { id: string }).id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
        ;(session.user as { status?: string }).status = token.status as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
    authorized() {
      // La protección de rutas se hace en middleware.ts (redirect si no hay sesión / no APPROVED / no ADMIN)
      return true
    },
  },
  pages: {
    signIn: '/login',
  },
  events: {
    async createUser({ user }) {
      if (user.email === ADMIN_EMAIL) {
        await prisma.user.updateMany({
          where: { email: user.email },
          data: { role: 'ADMIN', status: 'APPROVED' },
        })
      }
    },
  },
})
