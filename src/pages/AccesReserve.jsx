import { useAuth } from '../auth/contexte'
import { IconeAvion } from '../components/Icones'
import Texte from '../components/Texte'
import { useTextes } from '../lib/textes'

// Adresse de contact : celle saisie dans l'Espace RI (Textes du site), sinon celle du fichier .env
const CONTACT_ENV = import.meta.env.VITE_EMAIL_CONTACT_RI || ''

// Contenu affiché à une personne connectée qui n'est pas sur la liste des étudiants en échange
export function MessageAccesReserve({ onDeconnexion }) {
  const { user } = useAuth()
  const { textes } = useTextes()
  const contact = (textes.contact_ri || CONTACT_ENV).trim()
  return (
    <>
      <h1 className="tb-passeport__h1">Accès réservé</h1>
      <Texte className="tb-texte" valeur={textes.acces_refuse_texte} valeurs={{ email: user?.email }} />
      <Texte className="tb-texte" valeur={textes.acces_refuse_contact} valeurs={{
        contact: contact ? <> (<a href={`mailto:${contact}`}>{contact}</a>)</> : '',
      }} />
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
