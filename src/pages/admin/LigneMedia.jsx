import { miniature } from '../../lib/cloudinary'
import { versDate } from '../../lib/campagnes'
import Tampon from '../../components/Tampon'
import { IconeLecture } from '../../components/Icones'

// Une ligne de média dans l'espace RI, avec des boutons d'action libres (children)
export default function LigneMedia({ media: m, onOuvrir, infos, compteurs, children, accent }) {
  return (
    <div className={`tb-admin-ligne ${accent ? `tb-admin-ligne--${accent}` : ''}`}>
      <button type="button" className="tb-admin-ligne__vignette" onClick={onOuvrir} aria-label={`Voir « ${m.titre} »`}>
        <img src={miniature(m.fichier_url, 240)} alt="" loading="lazy" />
        {m.type === 'Vidéo' && <span className="tb-polaroid__lecture"><IconeLecture taille={14} /></span>}
      </button>
      <div className="tb-admin-ligne__texte">
        <p className="tb-admin-ligne__titre">{m.titre}</p>
        {m.caption && <p className="tb-admin-ligne__caption">{m.caption}</p>}
        <p>{m.prenom_nom} <span className="tb-muted">({m.filiere}{m.duree ? ` · ${m.duree}` : ''})</span></p>
        <p className="tb-muted">
          {[m.ville, m.universite].filter(Boolean).join(' — ')} · déposé le {versDate(m.created_at)?.toLocaleDateString('fr-FR')}
          {infos ? ` · ${infos}` : ''}
        </p>
      </div>
      <Tampon pays={m.pays} graine={m.id} />
      {compteurs && (
        <div className="tb-admin-ligne__compteurs">
          <span title="J’aime"><strong>{compteurs.likes}</strong> j’aime</span>
          <span title="Votes valides"><strong>{compteurs.votes}</strong> vote{compteurs.votes > 1 ? 's' : ''}</span>
        </div>
      )}
      <div className="tb-admin-ligne__actions">{children}</div>
    </div>
  )
}
