import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/contexte'
import { useCampagnes, phaseCampagne, formatFin, heureLocale } from '../lib/campagnes'
import { useMediasCampagne, useInteractions, cleType, limiteVotes } from '../lib/interactions'
import Polaroid from '../components/Polaroid'
import Mur from '../components/Mur'
import CartePostale from '../components/CartePostale'
import { IconeEtoile } from '../components/Icones'

const PAR_PAGE = 24 // souvenirs affichés d'un coup ; les suivants arrivent quand on descend

export default function Galerie() {
  const { user } = useAuth()
  const { campagnes, active } = useCampagnes()
  const [campagneId, setCampagneId] = useState(null)
  const campagne = campagnes.find(c => c.id === campagneId) || active

  const { medias, chargement } = useMediasCampagne(campagne?.id)
  // Souvenirs encore publiés : un vote pour un souvenir supprimé ne compte plus
  const idsValides = useMemo(() => (chargement ? null : new Set(medias.map(m => m.id))), [medias, chargement])
  const { nbLikes, mesLikes, bulletin, basculerLike, basculerVote } = useInteractions(campagne, user?.uid, idsValides)
  const phase = phaseCampagne(campagne)

  const [filtreType, setFiltreType] = useState('Tous')
  // ?pays=Japon quand on arrive depuis la carte du monde
  const [params] = useSearchParams()
  const [filtrePays, setFiltrePays] = useState(() => params.get('pays') || '')
  const [filtreFiliere, setFiltreFiliere] = useState('')
  const [tri, setTri] = useState('recents')
  const [ouvertId, setOuvertId] = useState(null)
  const [message, setMessage] = useState('')

  const changerCampagne = (id) => {
    setCampagneId(id); setFiltreType('Tous'); setFiltrePays(''); setFiltreFiliere(''); setOuvertId(null)
  }

  const visibles = useMemo(() => {
    const liste = medias
      .filter(m => filtreType === 'Tous' || m.type === filtreType)
      .filter(m => !filtrePays || m.pays === filtrePays)
      .filter(m => !filtreFiliere || m.filiere === filtreFiliere)
    if (tri === 'likes') return [...liste].sort((a, b) => nbLikes(b) - nbLikes(a))
    return liste
  }, [medias, filtreType, filtrePays, filtreFiliere, tri, nbLikes])

  // Chargement progressif : on repart de 24 dès qu'on change de filtre ou de campagne
  const cleAffichage = [campagne?.id, filtreType, filtrePays, filtreFiliere, tri].join('|')
  const [pagination, setPagination] = useState({ cle: '', nombre: PAR_PAGE })
  const nombreAffiches = pagination.cle === cleAffichage ? pagination.nombre : PAR_PAGE
  const affiches = visibles.slice(0, nombreAffiches)
  const resteAAfficher = visibles.length - affiches.length
  const afficherPlus = useCallback(
    () => setPagination({ cle: cleAffichage, nombre: nombreAffiches + PAR_PAGE }),
    [cleAffichage, nombreAffiches],
  )

  // Repère invisible en bas du mur : quand il entre à l'écran, on affiche la suite
  const repere = useRef(null)
  useEffect(() => {
    const el = repere.current
    if (!el || resteAAfficher <= 0 || !('IntersectionObserver' in window)) return
    const obs = new IntersectionObserver(entrees => {
      if (entrees.some(e => e.isIntersecting)) afficherPlus()
    }, { rootMargin: '600px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [afficherPlus, resteAAfficher])

  const paysDispo = [...new Set([...medias.map(m => m.pays), filtrePays].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'))
  const filieresDispo = [...new Set(medias.map(m => m.filiere).filter(Boolean))].sort()
  const nb = (type) => medias.filter(m => m.type === type).length

  const signaler = useCallback((e) => {
    setMessage(e?.message || 'Action impossible pour le moment.')
    setTimeout(() => setMessage(''), 4500)
  }, [])

  const propsLike = (m) => ({
    nombre: nbLikes(m),
    actif: mesLikes.has(m.id),
    onClick: () => basculerLike(m).catch(signaler),
  })
  const propsVote = (m) => phase.votesOuverts ? {
    actif: bulletin[cleType(m.type)].includes(m.id),
    desactive: m.uid === user?.uid,
    onClick: () => basculerVote(m).catch(signaler),
  } : null

  const restants = (type) => limiteVotes(campagne, type) - bulletin[cleType(type)].length
  const ouvert = medias.find(m => m.id === ouvertId)
  const fermer = useCallback(() => setOuvertId(null), [])

  if (!campagne) {
    return (
      <div className="tb-page">
        <h1 className="tb-h1">La galerie</h1>
        <p className="tb-encart">Aucune campagne pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="tb-page">
      <div className="tb-page__entete">
        <div>
          <h1 className="tb-h1">La galerie</h1>
          <p className="tb-manuscrit tb-annotation">tous les souvenirs du semestre</p>
        </div>
        {campagnes.length > 1 && (
          <div className="tb-etiquettes" role="tablist" aria-label="Campagnes">
            {campagnes.map(c => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === campagne.id}
                className={`tb-etiquette ${c.id === campagne.id ? 'is-actif' : ''}`}
                onClick={() => changerCampagne(c.id)}
              >
                {c.nom}
              </button>
            ))}
          </div>
        )}
      </div>

      {phase.votesOuverts && (
        <div className="tb-bandeau-vote">
          <IconeEtoile taille={22} plein />
          <p>
            <strong>Phase de vote ouverte jusqu’au {formatFin(campagne.finVotes)}</strong>
            {heureLocale(campagne.finVotes) && <> ({heureLocale(campagne.finVotes)})</>}.{' '}
            Il te reste {restants('Photo')} vote{restants('Photo') > 1 ? 's' : ''} photo
            et {restants('Vidéo')} vote{restants('Vidéo') > 1 ? 's' : ''} vidéo.
          </p>
          {phase.resultatsPublies && <Link to="/top5">Voir les lauréats</Link>}
        </div>
      )}

      <div className="tb-filtres">
        <div className="tb-segment" role="group" aria-label="Type de média">
          {[['Tous', `Tous · ${medias.length}`], ['Photo', `Photos · ${nb('Photo')}`], ['Vidéo', `Vidéos · ${nb('Vidéo')}`]].map(([val, label]) => (
            <button key={val} type="button" aria-pressed={filtreType === val}
              className={`tb-segment__btn ${filtreType === val ? 'is-actif' : ''}`}
              onClick={() => setFiltreType(val)}>
              {label}
            </button>
          ))}
        </div>
        <label className="tb-sr-only" htmlFor="filtre-pays">Pays</label>
        <select id="filtre-pays" className="tb-select" value={filtrePays} onChange={e => setFiltrePays(e.target.value)}>
          <option value="">Tous les pays</option>
          {paysDispo.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <label className="tb-sr-only" htmlFor="filtre-filiere">Filière</label>
        <select id="filtre-filiere" className="tb-select" value={filtreFiliere} onChange={e => setFiltreFiliere(e.target.value)}>
          <option value="">Toutes les filières</option>
          {filieresDispo.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <label className="tb-filtres__tri">
          Trier :
          <select className="tb-select tb-select--discret" value={tri} onChange={e => setTri(e.target.value)}>
            <option value="recents">les plus récents</option>
            <option value="likes">les plus likés</option>
          </select>
        </label>
      </div>

      {message && <p className="tb-toast" role="status">{message}</p>}

      {chargement ? (
        <p className="tb-muted">Chargement des souvenirs…</p>
      ) : visibles.length === 0 ? (
        <div className="tb-vide">
          <p className="tb-manuscrit">Le carnet est encore vide…</p>
          {phase.depotsOuverts && <Link to="/deposer" className="tb-btn tb-btn--corail">Coller le premier souvenir</Link>}
        </div>
      ) : (
        <>
          <Mur>
            {affiches.map(m => (
              <Polaroid
                key={m.id}
                media={m}
                onOuvrir={() => setOuvertId(m.id)}
                like={propsLike(m)}
                vote={propsVote(m)}
              />
            ))}
          </Mur>
          {resteAAfficher > 0 && (
            <div ref={repere} className="tb-actions tb-actions--centre">
              <button type="button" className="tb-btn tb-btn--contour" onClick={afficherPlus}>
                Voir plus de souvenirs ({resteAAfficher})
              </button>
            </div>
          )}
        </>
      )}

      {ouvert && (
        <CartePostale
          media={ouvert}
          nomCampagne={campagne.nom}
          onFermer={fermer}
          like={propsLike(ouvert)}
          vote={propsVote(ouvert)}
          telechargeable={ouvert.uid === user?.uid}
        />
      )}
    </div>
  )
}
