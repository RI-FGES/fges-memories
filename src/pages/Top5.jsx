import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCampagnes, phaseCampagne, formatDate, formatFin } from '../lib/campagnes'
import { miniature } from '../lib/cloudinary'
import { rotationStable } from '../lib/pays'
import Tampon from '../components/Tampon'
import CartePostale from '../components/CartePostale'
import Confettis from '../components/Confettis'
import { IconeEtoile, IconeLecture } from '../components/Icones'

// La révélation ne se joue qu'une fois par campagne et par navigateur
const cleRevelation = (id) => `fges-memories-revelation-${id}`
function dejaRevele(id) {
  try { return window.localStorage.getItem(cleRevelation(id)) === 'oui' } catch { return false }
}
function memoriserRevelation(id) {
  try { window.localStorage.setItem(cleRevelation(id), 'oui') } catch { /* navigation privée */ }
}

function CarteLaureat({ laureat, index, revele, onOuvrir }) {
  return (
    <div className={`tb-laureat ${revele ? 'is-revele' : ''}`} style={{ '--delai': `${index * 0.35}s` }}>
      <div className="tb-laureat__faces">
        {/* Dos de la carte, avant la révélation */}
        <div className="tb-laureat__dos" aria-hidden={revele}>
          <span className="tb-laureat__sceau">FGES</span>
          <span className="tb-manuscrit">Qui sera lauréat·e&nbsp;?</span>
        </div>
        {/* Face visible après la révélation */}
        <button
          type="button"
          className="tb-laureat__face"
          style={{ '--rot': `${rotationStable(laureat.mediaId, 2.5)}deg` }}
          onClick={onOuvrir}
          tabIndex={revele ? 0 : -1}
          aria-hidden={!revele}
          aria-label={`Ouvrir « ${laureat.titre} » de ${laureat.prenom_nom}`}
        >
          <span className="tb-laureat__ruban"><IconeEtoile taille={14} plein /> Lauréat·e</span>
          <span className="tb-laureat__photo">
            <img src={miniature(laureat.fichier_url, 600)} alt="" loading="lazy" />
            {laureat.type === 'Vidéo' && <span className="tb-polaroid__lecture"><IconeLecture /></span>}
          </span>
          <Tampon pays={laureat.pays} graine={laureat.mediaId} className="tb-laureat__tampon" />
          <span className="tb-manuscrit tb-laureat__titre">{laureat.titre}</span>
          <span className="tb-laureat__meta">{laureat.prenom_nom}{laureat.filiere ? ` · ${laureat.filiere}` : ''}</span>
        </button>
      </div>
    </div>
  )
}

export default function Top5() {
  const { campagnes, active } = useCampagnes()
  const [campagneId, setCampagneId] = useState(null)
  const [onglet, setOnglet] = useState('photo')
  const [ouvert, setOuvert] = useState(null)
  const [revelations, setRevelations] = useState({}) // { campagneId: true } pour cette visite
  const [fete, setFete] = useState(false)
  const fermer = useCallback(() => setOuvert(null), [])

  const campagne = campagnes.find(c => c.id === campagneId) || active
  const phase = phaseCampagne(campagne)
  const laureats = campagne?.resultats?.[onglet] || []
  const revele = !!campagne && (revelations[campagne.id] || dejaRevele(campagne.id))

  function reveler() {
    memoriserRevelation(campagne.id)
    setRevelations(r => ({ ...r, [campagne.id]: true }))
    setFete(true)
    setTimeout(() => setFete(false), 4000)
  }

  return (
    <div className="tb-page tb-top5">
      {fete && <Confettis nombre={48} />}

      <div className="tb-centre">
        <p className="tb-surtitre">Élus par les votes des étudiants</p>
        <h1 className="tb-h1">Les lauréats{campagne ? ` du ${campagne.nom}` : ''}</h1>
        <p className="tb-texte">
          Les 5 photos et les 5 vidéos qui ont reçu le plus de votes. Pas de classement entre eux :
          tous les lauréats sont à égalité.
        </p>
      </div>

      {campagnes.length > 1 && (
        <div className="tb-etiquettes tb-etiquettes--centre" role="tablist" aria-label="Campagnes">
          {campagnes.map(c => (
            <button key={c.id} type="button" role="tab" aria-selected={c.id === campagne?.id}
              className={`tb-etiquette ${c.id === campagne?.id ? 'is-actif' : ''}`}
              onClick={() => setCampagneId(c.id)}>
              {c.nom}
            </button>
          ))}
        </div>
      )}

      {!campagne?.resultatsPublies ? (
        <div className="tb-bientot">
          <p className="tb-manuscrit">Roulement de tambour…</p>
          <h2 className="tb-h2">Les lauréats ne sont pas encore connus</h2>
          <p className="tb-texte">
            {phase.votesOuverts
              ? `Les votes sont ouverts jusqu’au ${formatFin(campagne.finVotes)}. C’est le moment de soutenir tes souvenirs préférés !`
              : campagne?.debutVotes
                ? `Les votes auront lieu du ${formatDate(campagne.debutVotes)} au ${formatFin(campagne.finVotes)}.`
                : 'Les dates de vote seront bientôt annoncées.'}
          </p>
          <div className="tb-actions tb-actions--centre">
            <Link to="/galerie" className="tb-btn tb-btn--marine">{phase.votesOuverts ? 'Aller voter' : 'Explorer la galerie'}</Link>
            <Link to="/comment-ca-marche" className="tb-btn tb-btn--contour">Comment ça marche ?</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="tb-segment tb-segment--centre" role="group" aria-label="Catégorie">
            {[['photo', 'Lauréats photo'], ['video', 'Lauréats vidéo']].map(([val, label]) => (
              <button key={val} type="button" aria-pressed={onglet === val}
                className={`tb-segment__btn ${onglet === val ? 'is-actif' : ''}`} onClick={() => setOnglet(val)}>
                {label}
              </button>
            ))}
          </div>

          {laureats.length === 0 ? (
            <p className="tb-muted tb-centre">Aucun lauréat dans cette catégorie.</p>
          ) : (
            <>
              <div className="tb-laureats">
                {laureats.map((l, i) => (
                  <CarteLaureat key={l.mediaId} laureat={l} index={i} revele={revele} onOuvrir={() => setOuvert(l)} />
                ))}
              </div>
              {!revele && (
                <div className="tb-centre">
                  <button type="button" className="tb-btn tb-btn--corail tb-btn--large tb-btn-revelation" onClick={reveler}>
                    Révéler les lauréats
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {ouvert && <CartePostale media={ouvert} nomCampagne={campagne?.nom} onFermer={fermer} />}
    </div>
  )
}
