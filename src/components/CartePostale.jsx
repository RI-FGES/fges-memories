import { useEffect, useRef, useState } from 'react'
import { IconeAvion, IconeCoeur, IconeEtoile, IconeFermer } from './Icones'
import { couleurTampon } from '../lib/pays'
import { versDate } from '../lib/campagnes'
import { videoOptimisee, miniature } from '../lib/cloudinary'
import BoutonCarte from './BoutonCarte'

const DUREE_LABEL = { S1: 'Semestre 1', S2: 'Semestre 2', Année: 'Année complète' }

function cachetDate(iso) {
  const d = versDate(iso)
  if (!d) return ''
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace('.', '')
}

// Vue détaillée d'un souvenir façon carte postale (fenêtre modale)
export default function CartePostale({ media, onFermer, like, vote, nomCampagne, telechargeable = false }) {
  const boutonFermer = useRef(null)
  // Sur mobile, la carte se retourne : recto (photo) puis verso (message)
  const [retournee, setRetournee] = useState(false)

  useEffect(() => {
    boutonFermer.current?.focus()
    function surTouche(e) { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', surTouche)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', surTouche)
      document.body.style.overflow = overflow
    }
  }, [onFermer])

  if (!media) return null
  const prenom = (media.prenom_nom || '').split(' ')[0]
  const ville = media.ville || (media.universite || '').split(' - ')[0]

  return (
    <div className="tb-modale" onClick={onFermer} role="presentation">
      <button ref={boutonFermer} type="button" className="tb-modale__fermer" onClick={onFermer} aria-label="Fermer">
        <IconeFermer />
      </button>

      <div
        className={`tb-carte-postale ${retournee ? 'is-retournee' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="carte-postale-titre"
        onClick={e => e.stopPropagation()}
      >
        <div className="tb-carte-postale__faces">
        <div className="tb-carte-postale__recto">
          {media.type === 'Vidéo' ? (
            <video src={videoOptimisee(media.fichier_url)} poster={miniature(media.fichier_url, 1000)} controls autoPlay playsInline />
          ) : (
            <img src={miniature(media.fichier_url, 1400)} alt={media.titre} />
          )}
          <button type="button" className="tb-btn tb-btn--marine tb-btn-retourner" onClick={() => setRetournee(true)}>
            Retourner la carte
          </button>
        </div>

        <div className="tb-carte-postale__verso">
          <button type="button" className="tb-lien-discret tb-btn-retourner" onClick={() => setRetournee(false)}>
            ← Revoir la photo
          </button>
          <div className="tb-carte-postale__entete">
            <div>
              <p className="tb-carte-postale__label">Carte postale</p>
              {nomCampagne && <p className="tb-carte-postale__sous-label">Campagne {nomCampagne}</p>}
            </div>
            <div className="tb-carte-postale__affranchissement">
              <div className="tb-cachet" aria-hidden="true">
                <span>{(ville || media.pays || '').toUpperCase()}</span>
                <span className="tb-cachet__date">{cachetDate(media.created_at)}</span>
                <span>FGES</span>
              </div>
              <div className="tb-timbre">
                <div className="tb-timbre__interieur" style={{ background: couleurTampon(media.pays) }}>
                  <span className="tb-timbre__haut">FGES</span>
                  <IconeAvion taille={30} />
                  <span className="tb-timbre__pays">{media.pays}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="tb-carte-postale__corps">
            <div className="tb-carte-postale__message">
              <h2 id="carte-postale-titre" className="tb-manuscrit tb-carte-postale__titre">{media.titre}</h2>
              {media.caption && <p className="tb-manuscrit tb-carte-postale__caption">{media.caption}</p>}
              <p className="tb-manuscrit tb-carte-postale__signature">— {prenom}{media.filiere ? `, ${media.filiere}` : ''}</p>
            </div>
            <div className="tb-carte-postale__adresse">
              <p>{media.prenom_nom}</p>
              <p>{media.universite}</p>
              <p>{[ville, media.pays].filter(Boolean).join(' — ')}</p>
              <p>{DUREE_LABEL[media.duree] || media.duree || ' '}</p>
            </div>
          </div>

          {(like || vote || telechargeable) && (
            <div className="tb-carte-postale__actions">
              {like && (
                <button
                  type="button"
                  className={`tb-btn-like tb-btn-like--grand ${like.actif ? 'is-actif' : ''}`}
                  onClick={like.onClick}
                  aria-pressed={like.actif}
                >
                  <IconeCoeur plein={like.actif} />
                  {like.nombre || 0} j’aime
                </button>
              )}
              {vote && (
                <button
                  type="button"
                  className={`tb-btn-vote tb-btn-vote--grand ${vote.actif ? 'is-actif' : ''}`}
                  onClick={vote.onClick}
                  disabled={vote.desactive}
                  aria-pressed={vote.actif}
                >
                  <IconeEtoile plein={vote.actif} />
                  {vote.desactive ? 'C’est ton souvenir' : vote.actif ? 'Retirer mon vote' : 'Voter pour ce souvenir'}
                </button>
              )}
              {telechargeable && <BoutonCarte media={media} nomCampagne={nomCampagne} />}
              <span className="tb-carte-postale__date">Déposé le {versDate(media.created_at)?.toLocaleDateString('fr-FR')}</span>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
