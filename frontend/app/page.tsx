'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const userType = localStorage.getItem('userType')
    if (userType === 'supervisor') {
      router.push('/dashboard')
    } else if (userType === 'caller') {
      router.push('/caller')
    } else {
      router.push('/login')
    }
  }, [router])

  return null
}