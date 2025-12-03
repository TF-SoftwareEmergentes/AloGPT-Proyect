'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { API_BASE_URL } from '@/lib/config'

export default function LoginPage() {
  const [view, setView] = useState<'role' | 'login' | 'register'>('role')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<'supervisor' | 'agent'>('agent')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login?email=${encodeURIComponent(email)}&contraseña=${encodeURIComponent(password)}`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error en inicio de sesión')
      }
      
      const data = await response.json()
      
      if (data.success && data.user) {
        localStorage.setItem('userType', data.user.rol)
        localStorage.setItem('userEmail', data.user.email)
        localStorage.setItem('userName', data.user.nombre)
        localStorage.setItem('userDept', data.user.departamento || '')
        
        if (data.user.rol === 'supervisor') {
          router.push('/dashboard')
        } else {
          router.push('/caller')
        }
      }
    } catch (error) {
      console.error('Error en login:', error)
      setError(error instanceof Error ? error.message : 'Error en inicio de sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register?email=${encodeURIComponent(email)}&contraseña=${encodeURIComponent(password)}&nombre=${encodeURIComponent(nombre)}&rol=${encodeURIComponent(rol)}`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Error en registro')
      }
      
      const data = await response.json()
      if (data.success) {
        alert('¡Usuario registrado! Por favor, inicia sesión.')
        setView('login')
        setEmail('')
        setPassword('')
        setNombre('')
      }
    } catch (error) {
      console.error('Error en registro:', error)
      setError(error instanceof Error ? error.message : 'Error en registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg border border-gray-300 p-8 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-blue-900 mb-2">Promise Analyzer</h1>
            <p className="text-gray-600">Call Intelligence Platform</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {view === 'role' ? (
            <div className="space-y-4">
              <p className="text-gray-700 text-center mb-6 font-semibold">Selecciona tu rol:</p>
              <button
                onClick={() => { setRol('supervisor'); setView('login') }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
              >
                Supervisor
              </button>
              <button
                onClick={() => { setRol('agent'); setView('login') }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition"
              >
                Agente
              </button>
            </div>
          ) : view === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <button
                type="button"
                onClick={() => { setView('role'); setError('') }}
                className="text-gray-600 hover:text-gray-900 text-sm mb-4"
              >
                ← Atrás
              </button>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@banco.com"
                  className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>

              <p className="text-gray-600 text-center text-sm">
                ¿No tienes cuenta? <button onClick={() => setView('register')} className="text-blue-600 cursor-pointer hover:text-blue-700 font-bold">Regístrate aquí</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <button
                type="button"
                onClick={() => { setView('role'); setError('') }}
                className="text-gray-600 hover:text-gray-900 text-sm mb-4"
              >
                ← Atrás
              </button>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Nombre Completo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@banco.com"
                  className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Rol</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as 'supervisor' | 'agent')}
                  className="w-full px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="agent">Agente</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Registrando...' : 'Registrarse'}
              </button>

              <p className="text-gray-600 text-center text-sm">
                ¿Ya tienes cuenta? <button onClick={() => setView('login')} className="text-blue-600 cursor-pointer hover:text-blue-700 font-bold">Inicia sesión</button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
