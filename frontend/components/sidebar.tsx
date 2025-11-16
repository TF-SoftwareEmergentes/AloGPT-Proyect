'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [userType, setUserType] = useState<string>('')
  const [userName, setUserName] = useState('Usuario')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const type = localStorage.getItem('userType')
    const name = localStorage.getItem('userName')
    const email = localStorage.getItem('userEmail')
    setUserType(type || 'agent')
    setUserName(name || 'Usuario')
    setUserEmail(email || '')
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('userType')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    localStorage.removeItem('userDept')
    router.push('/login')
  }

  const isSupervisor = userType === 'supervisor'

  const supervisorMenu = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Histórico', href: '/dashboard/historical' },
    { label: 'Llamadas en Vivo', href: '/dashboard/live-calls' },
    { label: 'Alertas Críticas', href: '/dashboard/alerts' },
    { label: 'Análisis de Equipo', href: '/dashboard/team-analysis' },
    { label: 'Configuración', href: '/dashboard/settings' },
  ]

  const agentMenu = [
    { label: 'Dashboard', href: '/caller' },
    { label: 'Mis Llamadas', href: '/caller/calls' },
    { label: 'Mi Desempeño', href: '/caller/performance' },
    { label: 'Mi Perfil', href: '/caller/profile' },
    { label: '🎙️ Analizar Audio', href: '/caller/audio-analyzer' },
    { label: '📞 Llamada en Vivo', href: '/caller/live-call' },
  ]

  const menu = isSupervisor ? supervisorMenu : agentMenu

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <aside className="w-64 bg-blue-900 min-h-screen p-4 flex flex-col border-r border-gray-300">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Promise Analyzer</h1>
        <p className="text-blue-200 text-xs">Plataforma de Inteligencia en Llamadas</p>
      </div>

      {/* Switch Role */}
      <div className="mb-6 space-y-2">
        <p className="text-blue-200 text-xs uppercase font-bold">Cambiar Rol</p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              localStorage.setItem('userType', 'agent')
              window.location.reload()
            }}
            className={`flex-1 px-2 py-2 rounded text-sm font-bold transition ${
              userType === 'agent' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-800 text-blue-200 hover:bg-blue-700'
            }`}
          >
            Agente
          </button>
          <button
            onClick={() => {
              localStorage.setItem('userType', 'supervisor')
              window.location.reload()
            }}
            className={`flex-1 px-2 py-2 rounded text-sm font-bold transition ${
              userType === 'supervisor' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-800 text-blue-200 hover:bg-blue-700'
            }`}
          >
            Supervisor
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="mb-6 p-4 bg-blue-800 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
            {getInitials(userName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm truncate">{userName}</p>
            <p className="text-blue-200 text-xs truncate">{isSupervisor ? 'Supervisor' : 'Agente'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {menu.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded text-sm transition ${
              pathname === item.href
                ? 'bg-blue-700 text-white font-bold'
                : 'text-blue-200 hover:bg-blue-800'
            }`}
          >
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded transition text-sm mt-4"
      >
        Cerrar Sesión
      </button>
    </aside>
  )
}
