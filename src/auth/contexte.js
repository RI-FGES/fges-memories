import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}

// Domaines autorisés (UX uniquement : la vraie protection est dans firestore.rules)
export const DOMAINES_AUTORISES = (import.meta.env.VITE_DOMAINES_AUTORISES || '')
  .split(',')
  .map(d => d.trim().toLowerCase())
  .filter(Boolean)

export function emailAutorise(email) {
  const domaine = (email || '').trim().toLowerCase().split('@')[1]
  if (!domaine) return false
  if (DOMAINES_AUTORISES.length === 0) return true
  return DOMAINES_AUTORISES.includes(domaine)
}

// "lea.martin@univ.fr" -> "Léa Martin" (approximatif : l'étudiant peut corriger)
export function nomDepuisEmail(email) {
  const local = (email || '').split('@')[0]
  return local
    .split(/[._-]+/)
    .filter(p => p && !/^\d+$/.test(p))
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}
