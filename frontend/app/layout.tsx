import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SCEMAS — Smart City Environmental Monitoring',
  description: 'Real-time environmental monitoring and alert system for urban areas.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
