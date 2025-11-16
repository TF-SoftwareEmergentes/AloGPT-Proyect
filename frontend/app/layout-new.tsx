import type { Metadata } from 'next'
import styles from '../styles/layout.module.css'

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
      <body className={styles.body}>
        {children}
      </body>
    </html>
  )
}
