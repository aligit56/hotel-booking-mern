import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import AuthContext from './AuthContextValue'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
      setAuthError('')
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null)
        setAuthError('')
      } else {
        setAuthError(error.response?.data?.message || 'Unable to verify your session.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    api.get('/auth/me')
      .then(({ data }) => {
        if (active) {
          setUser(data.user)
          setAuthError('')
        }
      })
      .catch((error) => {
        if (!active) return
        if (error.response?.status === 401) {
          setUser(null)
          setAuthError('')
        } else {
          setAuthError(error.response?.data?.message || 'Unable to verify your session.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const signIn = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials)
    setUser(data.user)
    setAuthError('')
    return data.user
  }

  const signUp = async (details) => {
    const { data } = await api.post('/auth/register', details)
    setUser(data.user)
    setAuthError('')
    return data.user
  }

  const signOut = async () => {
    await api.post('/auth/logout')
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, loading, authError, signIn, signUp, signOut, refreshUser }),
    [user, loading, authError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
