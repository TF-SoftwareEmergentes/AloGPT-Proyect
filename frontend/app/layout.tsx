import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AloGpt',
  generator: 'glitter.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/tailwind.css" />
      </head>
      <body className="bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}