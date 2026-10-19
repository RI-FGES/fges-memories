import { useEffect, useState, useCallback } from 'react'
import {
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { AuthContext, emailAutorise } from './contexte'

const CLE_EMAIL = 'fges-memories-email'

function lireEmailMemorise() {
  try { return window.localStorage.getItem(CLE_EMAIL) || '' } catch { return '' }
}
function memoriserEmail(email) {
  try { window.localStorage.setItem(CLE_EMAIL, email) } catch { /* navigation privée */ }
}
function oublierEmail() {
  try { window.localStorage.removeItem(CLE_EMAIL) } catch { /* rien */ }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSortant, setIsSortant] = useState(false) // inscrit sur la liste des étudiants en échange
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      // On vérifie les droits AVANT de mettre à jour l'utilisateur,
      // pour ne jamais afficher « accès refusé » pendant une fraction de seconde
      setChargement(true)
      let admin = false
      let sortant = false
      if (u?.email) {
        const email = u.email.toLowerCase()
        const [snapAdmin, snapSortant] = await Promise.all([
          getDoc(doc(db, 'admins', email)).catch(() => null),
          getDoc(doc(db, 'sortants', email)).catch(() => null),
        ])
        admin = !!snapAdmin?.exists()
        sortant = !!snapSortant?.exists()
      }
      setUser(u)
      setIsAdmin(admin)
      setIsSortant(sortant)
      setChargement(false)
    })
  }, [])

  const envoyerLien = useCallback(async (email) => {
    const propre = email.trim().toLowerCase()
    if (!emailAutorise(propre)) {
      throw new Error('Utilise ton adresse email universitaire.')
    }
    await sendSignInLinkToEmail(auth, propre, {
      url: `${window.location.origin}/connexion`,
      handleCodeInApp: true,
    })
    memoriserEmail(propre)
  }, [])

  const [lienEnCours, setLienEnCours] = useState(() => isSignInWithEmailLink(auth, window.location.href))

  const terminerConnexion = useCallback(async (emailSaisi) => {
    const email = (emailSaisi || lireEmailMemorise()).trim().toLowerCase()
    if (!email) throw new Error('EMAIL_REQUIS')
    await signInWithEmailLink(auth, email, window.location.href)
    oublierEmail()
    window.history.replaceState(null, '', '/connexion')
    setLienEnCours(false)
  }, [])

  // Connexion par mot de passe : comptes du staff RI (Espace RI),
  // et mode test des étudiants en développement uniquement.
  const connexionMotDePasse = useCallback(
    (email, motDePasse) => signInWithEmailAndPassword(auth, email.trim().toLowerCase(), motDePasse),
    [],
  )

  const reinitialiserMotDePasse = useCallback(
    (email) => sendPasswordResetEmail(auth, email.trim().toLowerCase()),
    [],
  )

  const deconnexion = useCallback(() => signOut(auth), [])

  const valeur = {
    user,
    isAdmin,
    isSortant,
    // accès à la partie étudiante : étudiants inscrits sur la liste, et l'équipe RI
    aAcces: isAdmin || isSortant,
    chargement,
    envoyerLien,
    lienEnCours,
    emailMemorise: lireEmailMemorise(),
    terminerConnexion,
    connexionMotDePasse,
    connexionTest: connexionMotDePasse,
    reinitialiserMotDePasse,
    deconnexion,
  }

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>
}
