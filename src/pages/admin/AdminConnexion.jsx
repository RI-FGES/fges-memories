import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/contexte'

const MESSAGES = {
  'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  'auth/invalid-email': 'Adresse email invalide.',
  'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
  'auth/user-disabled': 'Ce compte a été désactivé.',
  'auth/operation-not-allowed': 'La connexion par mot de passe n’est pas activée dans Firebase.',
}
const message = (e) => MESSAGES[e?.code] || e?.message || 'Connexion impossible.'

// Porte d'entrée de l'Espace RI : réservée au staff, email + mot de passe
export default function AdminConnexion() {
  const { user, isAdmin, connexionMotDePasse, reinitialiserMotDePasse, deconnexion } = useAuth()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function seConnecter(e) {
    e.preventDefault()
    setErreur(''); setInfo(''); setEnvoi(true)
    try {
      await connexionMotDePasse(email, motDePasse)
    } catch (err) {
      setErreur(message(err))
    } finally {
      setEnvoi(false)
    }
  }

  async function oubli() {
    setErreur(''); setInfo('')
    if (!email.trim()) return setErreur('Saisis d’abord ton adresse email ci-dessus.')
    try {
      await reinitialiserMotDePasse(email)
      setInfo('Si ce compte existe, un email de réinitialisation vient d’être envoyé. Pense à vérifier la quarantaine de la messagerie universitaire.')
    } catch (err) {
      setErreur(message(err))
    }
  }

  // Connecté avec un compte étudiant (ou un compte sans rôle RI)
  if (user && !isAdmin) {
    return (
      <div className="tb-admin-connexion">
        <div className="tb-admin-connexion__carte">
          <p className="tb-surtitre tb-surtitre--corail">Accès réservé</p>
          <h1 className="tb-h2">Cet espace est réservé à l’équipe RI</h1>
          <p className="tb-texte">Tu es connecté·e avec <strong>{user.email}</strong>, qui n’a pas accès à l’Espace RI.</p>
          <div className="tb-actions">
            <button type="button" className="tb-btn tb-btn--marine" onClick={deconnexion}>Changer de compte</button>
            <Link to="/" className="tb-btn tb-btn--contour">Retour au carnet</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tb-admin-connexion">
      <div className="tb-admin-connexion__carte">
        <div className="tb-admin-connexion__badge" aria-hidden="true">
          <span>Équipage</span>
          <strong>RI</strong>
          <span>FGES</span>
        </div>
        <p className="tb-surtitre">Service des Relations Internationales</p>
        <h1 className="tb-h2">Espace RI</h1>
        <p className="tb-texte">Accès réservé à l’équipe RI : connecte-toi avec les identifiants du compte de service.</p>

        <form className="tb-form" onSubmit={seConnecter}>
          <div className="tb-champ">
            <label className="tb-label" htmlFor="staff-email">Email du service</label>
            <input id="staff-email" type="email" className="tb-input" autoComplete="username"
              value={email} onChange={e => { setEmail(e.target.value); setErreur('') }} required />
          </div>
          <div className="tb-champ">
            <label className="tb-label" htmlFor="staff-mdp">Mot de passe</label>
            <input id="staff-mdp" type="password" className="tb-input" autoComplete="current-password"
              value={motDePasse} onChange={e => { setMotDePasse(e.target.value); setErreur('') }} required />
          </div>
          {erreur && <p className="tb-erreur" role="alert">{erreur}</p>}
          {info && <p className="tb-note" role="status">{info}</p>}
          <button type="submit" className="tb-btn tb-btn--marine tb-btn--large" disabled={envoi}>
            {envoi ? 'Connexion…' : 'Accéder à l’Espace RI'}
          </button>
        </form>
        <button type="button" className="tb-lien-discret" onClick={oubli}>Mot de passe oublié ?</button>
      </div>
    </div>
  )
}
