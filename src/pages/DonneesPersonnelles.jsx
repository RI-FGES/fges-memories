import { Link } from 'react-router-dom'
import { useAuth } from '../auth/contexte'

// Page « Données personnelles » (information RGPD), accessible sans être connecté.
// Contenu à rédiger par l'IT / le DPO de l'université : remplacer le paragraphe ci-dessous.
// Liens vers cette page : page de connexion, pied de page du site, case de consentement au dépôt.

export default function DonneesPersonnelles() {
  const { user } = useAuth()

  return (
    <div className="tb-page tb-page--etroite tb-rgpd">
      <p className="tb-surtitre">FGES Memories</p>
      <h1 className="tb-h1">Données personnelles</h1>

      {/* ---- Contenu à compléter ---- */}
      <p className="tb-texte">Cette page est en cours de rédaction.</p>
      {/* ---- Fin du contenu ---- */}

      <div className="tb-actions">
        <Link to={user ? '/' : '/connexion'} className="tb-btn tb-btn--contour">
          {user ? 'Retour au site' : 'Retour à la connexion'}
        </Link>
      </div>
    </div>
  )
}
