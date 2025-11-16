'use client'

import { Sidebar } from '@/components/sidebar'
import { useEffect, useState } from 'react'

export default function DashboardLayout({
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
    <div className="flex bg-white min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
