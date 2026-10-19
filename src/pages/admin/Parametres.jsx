import { useState } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAuth } from '../../auth/contexte'

const MIN_MDP = 8
const MESSAGES = {
  'auth/invalid-credential': 'Mot de passe actuel incorrect.',
  'auth/wrong-password': 'Mot de passe actuel incorrect.',
  'auth/weak-password': `Mot de passe trop faible (${MIN_MDP} caractères minimum).`,
  'auth/requires-recent-login': 'Déconnecte-toi, reconnecte-toi, puis réessaie.',
}

// Section « Paramètres » : mot de passe du compte de service RI (partagé par l'équipe)
export default function Parametres() {
  const { user } = useAuth()
  const [mdp, setMdp] = useState({ actuel: '', nouveau: '', confirmation: '' })
  const [retour, setRetour] = useState({ type: '', texte: '' })

  async function changer(e) {
    e.preventDefault()
    if (mdp.nouveau.length < MIN_MDP) return setRetour({ type: 'erreur', texte: `${MIN_MDP} caractères minimum.` })
    if (mdp.nouveau !== mdp.confirmation) return setRetour({ type: 'erreur', texte: 'Les deux nouveaux mots de passe ne correspondent pas.' })
    try {
      await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, mdp.actuel))
      await updatePassword(auth.currentUser, mdp.nouveau)
      setMdp({ actuel: '', nouveau: '', confirmation: '' })
      setRetour({ type: 'ok', texte: 'Mot de passe modifié. Pense à prévenir le reste de l’équipe.' })
    } catch (err) {
      setRetour({ type: 'erreur', texte: MESSAGES[err?.code] || err.message })
    }
  }

  return (
    <section className="tb-admin-section">
      <div className="tb-carte-admin tb-carte-admin--etroite">
        <h2 className="tb-h3">Mot de passe de l’Espace RI</h2>
        <p className="tb-note">
          L’équipe partage un seul compte de service : <strong>{user?.email}</strong>.
          Si tu changes le mot de passe ici, il change pour tout le monde.
        </p>
        <form className="tb-form" onSubmit={changer}>
          <div className="tb-champ">
            <label className="tb-label" htmlFor="p-actuel">Mot de passe actuel</label>
            <input id="p-actuel" type="password" className="tb-input" autoComplete="current-password"
              value={mdp.actuel} onChange={e => { setMdp({ ...mdp, actuel: e.target.value }); setRetour({}) }} />
          </div>
          <div className="tb-champ">
            <label className="tb-label" htmlFor="p-nouveau">Nouveau mot de passe</label>
            <input id="p-nouveau" type="password" className="tb-input" autoComplete="new-password"
              value={mdp.nouveau} onChange={e => { setMdp({ ...mdp, nouveau: e.target.value }); setRetour({}) }} />
          </div>
          <div className="tb-champ">
            <label className="tb-label" htmlFor="p-confirmation">Confirmer le nouveau mot de passe</label>
            <input id="p-confirmation" type="password" className="tb-input" autoComplete="new-password"
              value={mdp.confirmation} onChange={e => { setMdp({ ...mdp, confirmation: e.target.value }); setRetour({}) }} />
          </div>
          {retour.texte && <p className={retour.type === 'erreur' ? 'tb-erreur' : 'tb-note'} role="status">{retour.texte}</p>}
          <button type="submit" className="tb-btn tb-btn--marine">Changer le mot de passe</button>
        </form>
      </div>
    </section>
  )
}
