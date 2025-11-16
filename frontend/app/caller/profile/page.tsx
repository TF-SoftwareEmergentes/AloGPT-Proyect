'use client'

import { Sidebar } from '@/components/sidebar'
import { useEffect, useState } from 'react'

export default function CallerProfilePage() {
  const [authorized, setAuthorized] = useState(false)
  const [userName, setUserName] = useState('Usuario')
  const [userEmail, setUserEmail] = useState('')
  const [userDept, setUserDept] = useState('')

  useEffect(() => {
    const userType = localStorage.getItem('userType')
    const name = localStorage.getItem('userName')
    const email = localStorage.getItem('userEmail')
    const dept = localStorage.getItem('userDept')

    if (!userType) {
      window.location.href = '/login'
    } else if (userType !== 'agent') {
      window.location.href = '/dashboard'
    } else {
      setAuthorized(true)
      setUserName(name || 'Usuario')
      setUserEmail(email || '')
      setUserDept(dept || 'Agente de Llamadas')
    }
  }, [])

  if (!authorized) return null

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className="flex bg-white min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 overflow-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Perfil</h1>
          <p className="text-gray-600">Información personal y preferencias</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl font-bold text-white">{getInitials(userName)}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 text-center">{userName}</h2>
                <p className="text-gray-600 text-sm text-center">{userDept}</p>
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Información Personal</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-600 text-sm font-semibold">Email</label>
                  <p className="text-gray-900">{userEmail}</p>
                </div>
                <div>
                  <label className="text-gray-600 text-sm font-semibold">Departamento</label>
                  <p className="text-gray-900">{userDept}</p>
                </div>
                <div>
                  <label className="text-gray-600 text-sm font-semibold">Rol</label>
                  <p className="text-gray-900">Agente de Llamadas</p>
                </div>
                <div>
                  <label className="text-gray-600 text-sm font-semibold">Estado</label>
                  <p className="text-green-600 font-bold">Activo</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Certificaciones</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-gray-900">Certificación de Asesoramiento Financiero</span>
                  <span className="text-green-600 text-sm font-bold">✓ Verificado</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-gray-900">Curso de Comunicación Efectiva</span>
                  <span className="text-green-600 text-sm font-bold">✓ Completado</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-gray-900">Protocolo de Atención al Cliente</span>
                  <span className="text-green-600 text-sm font-bold">✓ Vigente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
