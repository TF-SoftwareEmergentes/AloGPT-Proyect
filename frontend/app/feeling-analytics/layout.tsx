'use client'

import { Sidebar } from '@/components/sidebar'
import { useEffect, useState } from 'react'

export default function FeelingAnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const userType = localStorage.getItem('userType')
    if (!userType) {
      window.location.href = '/login'
    } else {
      setAuthorized(true)
    }
  }, [])

  if (!authorized) return null

  return (
    <div className="flex bg-gradient-to-br from-indigo-950 via-blue-950 to-indigo-950 min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
