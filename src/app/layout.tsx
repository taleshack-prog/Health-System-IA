import type { Metadata } from 'next'
import NextAuthProvider from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: 'HackFarm Observability',
  description: 'Dashboard de Observabilidade Assistida por IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0 }}>
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  )
}
