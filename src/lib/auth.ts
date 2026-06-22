import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { sql } from '@/lib/neon/client'
import { createHash } from 'crypto'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.organizationId = (user as any).organizationId
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).organizationId = token.organizationId
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const hash = createHash('sha256').update(credentials.password).digest('hex')
        const rows = await sql(
          'SELECT u.id, u.email, u.full_name, u.password_hash, om.organization_id, om.role FROM hack_tech_farm.users u LEFT JOIN hack_tech_farm.organization_members om ON om.user_id = u.id WHERE u.email = $1 LIMIT 1',
          [credentials.email]
        )
        if (!rows.length) return null
        if (rows[0].password_hash !== hash) return null
        return {
          id: rows[0].id as string,
          email: rows[0].email as string,
          name: rows[0].full_name as string,
          organizationId: rows[0].organization_id as string,
          role: rows[0].role as string,
        }
      },
    }),
  ],
}
