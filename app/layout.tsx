import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Web Gobang - AI-Powered Five in a Row',
  description: 'Play Gobang (Five in a Row) against AI or watch AI vs AI matches',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="light">
      <body className={inter.className}>
        <main className="min-h-screen bg-base-200">
          {children}
        </main>
      </body>
    </html>
  )
} 