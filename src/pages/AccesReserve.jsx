import { useAuth } from '../auth/contexte'
import { IconeAvion } from '../components/Icones'

const CONTACT_RI = import.meta.env.VITE_EMAIL_CONTACT_RI || ''

// Contenu affiché à une personne connectée qui n'est pas sur la liste des étudiants en échange
export function MessageAccesReserve({ onDeconnexion }) {
  const { user } = useAuth()
  return (
    <>
      <h1 className="tb-passeport__h1">Accès réservé</h1>
      <p className="tb-texte">
        FGES Memories est réservé aux étudiants de la FGES partis en échange.
        L’adresse <strong>{user?.email}</strong> n’est pas sur la liste des voyageurs.
      </p>
      <p className="tb-texte">
        Tu es parti·e en échange ? Écris au service des Relations Internationales
        {CONTACT_RI ? <> (<a href={`mailto:${CONTACT_RI}`}>{CONTACT_RI}</a>)</> : ''} pour être ajouté·e.
      </p>
      <div className="tb-tampon-acces tb-tampon-acces--refuse" aria-hidden="true">Accès refusé</div>
      <button type="button" className="tb-btn tb-btn--contour" onClick={onDeconnexion}>Utiliser une autre adresse</button>
    </>
  )
}

// Page complète, si la personne arrive directement sur le site
export default function AccesReserve() {
  const { deconnexion } = useAuth()
  return (
    <div className="tb-connexion">
      <div className="tb-passeport tb-passeport--seul is-ouvert">
        <div className="tb-passeport__bandeau tb-passeport__bandeau--toujours" aria-hidden="true">
          <IconeAvion taille={26} />
          <span>PASSEPORT</span>
        </div>
        <div className="tb-passeport__page">
          <p className="tb-surtitre tb-surtitre--corail">Contrôle des passeports</p>
          <MessageAccesReserve onDeconnexion={deconnexion} />
        </div>
      </div>
    </div>
  )
}
