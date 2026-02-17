import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AlignmentOS - Founder Diagnostic Tool',
  description: 'Pre-Series A Founder Diagnostic Tool for Venture Capital',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
