import Tampon from './Tampon'
import { IconeCoeur, IconeEtoile, IconeLecture } from './Icones'
import { miniature } from '../lib/cloudinary'
import { rotationStable } from '../lib/pays'

const SCOTCHS = ['tb-scotch--turquoise', 'tb-scotch--corail', 'tb-scotch--or']

/**
 * Carte "polaroïd" d'un souvenir.
 * - onOuvrir : ouvre la carte postale
 * - like : { nombre, actif, onClick } (optionnel)
 * - vote : { actif, onClick, desactive } (optionnel, seulement pendant la phase de vote)
 */
export default function Polaroid({ media, onOuvrir, like, vote, apercu = false }) {
  const rotation = rotationStable(media.id || 'apercu', 2)
  const scotch = SCOTCHS[Math.abs(Math.round(rotation * 10)) % SCOTCHS.length]
  const estVideo = media.type === 'Vidéo'
  const image = media.apercuUrl || miniature(media.fichier_url, 600)

  return (
    <article className="tb-polaroid" style={{ '--rot': `${rotation}deg` }}>
      <span className={`tb-scotch ${scotch}`} aria-hidden="true" />
      <button
        type="button"
        className="tb-polaroid__photo"
        onClick={onOuvrir}
        disabled={apercu || !onOuvrir}
        aria-label={`Ouvrir le souvenir « ${media.titre || 'sans titre'} »`}
      >
        {media.apercuVideo ? (
          <video src={media.apercuVideo} muted loop autoPlay playsInline />
        ) : image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <span className="tb-polaroid__vide">Ta photo ici</span>
        )}
        {estVideo && !media.apercuVideo && <span className="tb-polaroid__lecture"><IconeLecture /></span>}
      </button>
      <Tampon pays={media.pays} graine={media.id} className="tb-polaroid__tampon" />

      <h3 className="tb-polaroid__titre">{media.titre || 'Ta légende'}</h3>
      {media.caption && <p className="tb-polaroid__caption">{media.caption}</p>}
      <p className="tb-polaroid__meta">
        {media.prenom_nom || 'Prénom Nom'}{media.filiere ? ` · ${media.filiere}` : ''}
      </p>

      {(like || vote) && (
        <div className="tb-polaroid__actions">
          {like && (
            <button
              type="button"
              className={`tb-btn-like ${like.actif ? 'is-actif' : ''}`}
              onClick={like.onClick}
              aria-pressed={like.actif}
              aria-label={like.actif ? 'Retirer mon j’aime' : 'J’aime'}
            >
              <IconeCoeur plein={like.actif} />
              <span>{like.nombre || 0}</span>
            </button>
          )}
          {vote && (
            <button
              type="button"
              className={`tb-btn-vote ${vote.actif ? 'is-actif' : ''}`}
              onClick={vote.onClick}
              disabled={vote.desactive}
              aria-pressed={vote.actif}
              title={vote.desactive ? 'Tu ne peux pas voter pour ton propre souvenir' : undefined}
            >
              <IconeEtoile plein={vote.actif} />
              {vote.actif ? 'Mon vote' : 'Voter'}
            </button>
          )}
        </div>
      )}
    </article>
  )
}
