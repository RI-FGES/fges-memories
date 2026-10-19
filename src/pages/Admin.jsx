import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth/contexte'
import CampagnesProvider from '../components/CampagnesProvider'
import { useCampagnes, phaseCampagne, formatDate, versDate } from '../lib/campagnes'
import { ecouterInteractions, compterVotes, synchroniserCompteurs } from '../lib/statistiques'
import CartePostale from '../components/CartePostale'
import AdminConnexion from './admin/AdminConnexion'
import EnAttente from './admin/EnAttente'
import Publies from './admin/Publies'
import Votes from './admin/Votes'
import Campagne from './admin/Campagne'
import Parametres from './admin/Parametres'
import Etudiants from './admin/Etudiants'
import FinCampagne from './admin/FinCampagne'
import Textes from './admin/Textes'
import { exporterCSV } from './admin/outils'

const trierParDate = (liste) => liste.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

function Kpi({ valeur, label, accent }) {
  return (
    <div className={`tb-kpi ${accent ? `tb-kpi--${accent}` : ''}`}>
      <strong>{valeur}</strong>
      <span>{label}</span>
    </div>
  )
}

// Frise des étapes de la campagne : dépôts → votes → lauréats
function Frise({ campagne }) {
  const now = new Date()
  const p = phaseCampagne(campagne, now)
  const etat = (debut, fin) => {
    const d = versDate(debut)
    const f = versDate(fin)
    if (!d || !f) return { classe: 'a-fixer', label: 'Dates à fixer' }
    if (now < d) return { classe: 'a-venir', label: 'À venir' }
    if (now > f) return { classe: 'termine', label: 'Terminé' }
    return { classe: 'en-cours', label: 'En cours' }
  }
  const etapes = [
    { titre: 'Dépôts', dates: `${formatDate(campagne.debutDepots)} → ${formatDate(campagne.finDepots)}`, ...etat(campagne.debutDepots, campagne.finDepots) },
    { titre: 'Votes', dates: campagne.debutVotes ? `${formatDate(campagne.debutVotes)} → ${formatDate(campagne.finVotes)}` : '—', ...etat(campagne.debutVotes, campagne.finVotes) },
    p.resultatsPublies
      ? { titre: 'Lauréats', dates: 'Publiés sur le site', classe: 'termine', label: 'Publiés' }
      : { titre: 'Lauréats', dates: 'À publier après les votes', classe: 'a-venir', label: 'Pas encore publiés' },
  ]
  return (
    <ol className="tb-frise">
      {etapes.map(e => (
        <li key={e.titre} className={`tb-frise__etape is-${e.classe}`}>
          <span className="tb-frise__titre">{e.titre}</span>
          <span className="tb-frise__dates">{e.dates}</span>
          <span className="tb-frise__etat">{e.label}</span>
        </li>
      ))}
    </ol>
  )
}

function VueEnsemble({ campagne, campagnes, onChange, enAttente, publies, deCampagne, participants, nbInscrits, nbPays, nbLikes, nbVotants, likes, votes, allerA }) {
  const p = phaseCampagne(campagne)
  const votesTermines = campagne.finVotes && new Date() > versDate(campagne.finVotes)
  const aFaire = [
    nbInscrits === 0 && { texte: 'Aucun étudiant n’est sur la liste : personne ne peut encore se connecter', section: 'etudiants', bouton: 'Ajouter des étudiants' },
    enAttente.length > 0 && { texte: `${enAttente.length} souvenir(s) attendent ta validation`, section: 'attente', bouton: 'Valider' },
    !campagne.debutVotes && { texte: 'Les dates de vote ne sont pas encore fixées', section: 'campagne', bouton: 'Fixer les dates' },
    votesTermines && !p.resultatsPublies && { texte: 'Les votes sont terminés : les lauréats peuvent être publiés', section: 'votes', bouton: 'Voir les lauréats' },
    !campagne.active && { texte: 'Cette campagne n’est pas celle affichée sur le site', section: 'campagne', bouton: 'Modifier' },
  ].filter(Boolean)

  return (
    <section className="tb-admin-section">
      <Frise campagne={campagne} />

      {votesTermines && (
        <FinCampagne campagne={campagne} campagnes={campagnes} deCampagne={deCampagne} publies={publies}
          likes={likes} votes={votes} allerA={allerA} onChange={onChange} />
      )}

      <div className="tb-kpis">
        <Kpi valeur={enAttente.length} label="à valider" accent={enAttente.length ? 'attente' : null} />
        <Kpi valeur={publies.filter(m => m.type === 'Photo').length} label="photos publiées" />
        <Kpi valeur={publies.filter(m => m.type === 'Vidéo').length} label="vidéos publiées" />
        <Kpi valeur={participants} label={`participants sur ${nbInscrits} inscrits`} />
        <Kpi valeur={nbPays} label="pays" />
        <Kpi valeur={nbLikes} label="j’aime" />
        <Kpi valeur={nbVotants} label="votants" />
      </div>

      <div className="tb-carte-admin">
        <h2 className="tb-h3">À faire</h2>
        {aFaire.length === 0 ? (
          <p className="tb-muted">Rien d’urgent, tout est à jour.</p>
        ) : (
          <ul className="tb-a-faire">
            {aFaire.map(t => (
              <li key={t.texte}>
                <span>{t.texte}</span>
                <button type="button" className="tb-btn tb-btn--contour" onClick={() => allerA(t.section)}>{t.bouton}</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tb-actions">
        <button type="button" className="tb-btn tb-btn--contour" onClick={() => exporterCSV(deCampagne, likes, votes, campagne.nom)}>
          Exporter la liste des participants (CSV)
        </button>
      </div>
    </section>
  )
}

const SECTIONS = [
  { id: 'apercu', label: 'Vue d’ensemble' },
  { id: 'attente', label: 'À valider' },
  { id: 'publies', label: 'Publiés' },
  { id: 'votes', label: 'Votes & lauréats' },
  { id: 'etudiants', label: 'Étudiants autorisés' },
  { id: 'campagne', label: 'Campagne & dates' },
  { id: 'textes', label: 'Textes du site' },
  { id: 'parametres', label: 'Paramètres' },
]

function TableauDeBord() {
  const { user, deconnexion } = useAuth()
  const { campagnes, active, chargement, recharger: rechargerCampagnes } = useCampagnes()
  const [campagneId, setCampagneId] = useState('')
  const campagne = campagnes.find(c => c.id === campagneId) || active
  const [section, setSection] = useState('apercu')
  const [medias, setMedias] = useState([])
  const [sortants, setSortants] = useState([])
  const [interactions, setInteractions] = useState({ campagneId: null, likes: {}, nbLikes: 0, bulletins: [] })
  const [ouvert, setOuvert] = useState(null)
  const fermer = useCallback(() => setOuvert(null), [])
  // Tout se met à jour en direct (écoute Firebase) : plus besoin de bouton « Actualiser ».
  // Gardé pour les sections qui le demandent après une action : il n'a plus rien à faire.
  const toutRecharger = useCallback(() => {}, [])

  // Tous les souvenirs, en direct (nouveaux dépôts, corrections de légende, likes…)
  useEffect(() => onSnapshot(collection(db, 'medias'),
    snap => setMedias(trierParDate(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
    e => window.alert('Impossible de charger les médias : ' + e.message)), [])

  // Liste des étudiants autorisés, en direct
  useEffect(() => onSnapshot(collection(db, 'sortants'),
    snap => setSortants(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    e => console.error('Liste des étudiants indisponible', e)), [])

  // Likes et votes de la campagne affichée, en direct
  useEffect(() => {
    if (!campagne?.id) return
    return ecouterInteractions(campagne.id, setInteractions, e => console.error('Likes / votes indisponibles', e))
  }, [campagne?.id])

  const mediasParId = useMemo(() => Object.fromEntries(medias.map(m => [m.id, m])), [medias])
  const { votes, nbVotants } = useMemo(
    () => compterVotes(interactions.bulletins, mediasParId),
    [interactions.bulletins, mediasParId],
  )

  const deCampagne = medias.filter(m => campagne && m.campagneId === campagne.id)
  const enAttente = deCampagne.filter(m => m.statut !== 'accepte' && m.statut !== 'refuse')
  const refuses = deCampagne.filter(m => m.statut === 'refuse')
  const publies = deCampagne.filter(m => m.statut === 'accepte')
  const sansCampagne = medias.filter(m => !m.campagneId)

  // Compteurs de likes de la galerie : corrigés en silence s'ils ne correspondent plus aux likes réels.
  // Une seule fois par campagne et par ouverture de l'Espace RI (pas à chaque like reçu en direct)
  const dejaSynchronisees = useRef(new Set())
  useEffect(() => {
    if (!campagne?.id || interactions.campagneId !== campagne.id || medias.length === 0) return
    if (dejaSynchronisees.current.has(campagne.id)) return
    dejaSynchronisees.current.add(campagne.id)
    const aVerifier = medias.filter(m => m.campagneId === campagne.id && m.statut === 'accepte')
    synchroniserCompteurs(aVerifier, interactions.likes)
      .catch(e => console.error('Synchronisation des compteurs de likes impossible', e))
  }, [campagne?.id, interactions, medias])
  const attenteAutres = medias.filter(m => m.campagneId && m.campagneId !== campagne?.id && m.statut !== 'accepte' && m.statut !== 'refuse').length
  const participants = new Set(deCampagne.filter(m => m.statut !== 'refuse').map(m => m.uid || m.email)).size
  const nbPays = new Set(publies.map(m => m.pays).filter(Boolean)).size

  const compteur = { attente: enAttente.length, publies: publies.length, etudiants: sortants.length }
  // Sans campagne, seules la création de campagne et les paramètres ont du sens
  const SANS_CAMPAGNE = ['campagne', 'etudiants', 'textes', 'parametres']
  const sectionAffichee = !campagne && !SANS_CAMPAGNE.includes(section) ? 'campagne' : section

  function changerCampagne(id) {
    setCampagneId(id)
    setOuvert(null)
  }

  function rafraichirCampagnes() {
    rechargerCampagnes()
    toutRecharger()
  }

  return (
    <div className="tb-admin-app">
      <header className="tb-admin-barre">
        <div className="tb-admin-barre__titre">
          <span className="tb-nav__sceau">FGES</span>
          <span><strong>Memories</strong> · Espace RI</span>
        </div>
        <div className="tb-admin-barre__actions">
          <span className="tb-direct" title="Les nouveaux dépôts, likes et votes s’affichent automatiquement">Mises à jour en direct</span>
          <Link to="/" className="tb-lien-discret">Voir le site</Link>
          <button type="button" className="tb-btn tb-btn--contour" onClick={deconnexion}>Déconnexion</button>
        </div>
      </header>

      <div className="tb-admin-corps">
        <aside className="tb-admin-menu" aria-label="Menu de l’Espace RI">
          <div className="tb-champ">
            <label className="tb-label" htmlFor="choix-campagne">Campagne</label>
            {campagnes.length > 0 ? (
              <select id="choix-campagne" className="tb-select" value={campagne?.id || ''} onChange={e => changerCampagne(e.target.value)}>
                {campagnes.map(c => <option key={c.id} value={c.id}>{c.nom}{c.active ? ' · sur le site' : ''}</option>)}
              </select>
            ) : (
              <p className="tb-muted">{chargement ? 'Chargement…' : 'Aucune campagne'}</p>
            )}
          </div>
          <nav className="tb-admin-menu__liens">
            {SECTIONS.map(s => {
              const desactive = !campagne && !SANS_CAMPAGNE.includes(s.id)
              return (
                <button key={s.id} type="button" disabled={desactive}
                  className={`tb-admin-menu__lien ${sectionAffichee === s.id ? 'is-actif' : ''}`}
                  aria-current={sectionAffichee === s.id ? 'page' : undefined}
                  onClick={() => setSection(s.id)}>
                  <span>{s.label}</span>
                  {compteur[s.id] > 0 && (
                    <span className={`tb-admin-menu__compteur ${s.id === 'attente' ? 'is-attente' : ''}`}>{compteur[s.id]}</span>
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="tb-admin-contenu">
          <div className="tb-admin-contenu__entete">
            <p className="tb-surtitre">{campagne ? campagne.nom : 'Espace RI'}</p>
            <h1 className="tb-h2">{SECTIONS.find(s => s.id === sectionAffichee)?.label}</h1>
          </div>

          {sectionAffichee === 'apercu' && campagne && (
            <VueEnsemble campagne={campagne} campagnes={campagnes} onChange={rafraichirCampagnes} enAttente={enAttente} publies={publies} deCampagne={deCampagne}
              participants={participants} nbInscrits={sortants.length} nbPays={nbPays} nbLikes={interactions.nbLikes} nbVotants={nbVotants}
              likes={interactions.likes} votes={votes} allerA={setSection} />
          )}
          {sectionAffichee === 'attente' && campagne && (
            <EnAttente enAttente={enAttente} refuses={refuses} sansCampagne={sansCampagne} attenteAutres={attenteAutres}
              campagne={campagne} onChange={toutRecharger} onOuvrir={setOuvert} />
          )}
          {sectionAffichee === 'publies' && campagne && (
            <Publies publies={publies} deCampagne={deCampagne} likes={interactions.likes} votes={votes}
              campagne={campagne} onChange={toutRecharger} onOuvrir={setOuvert} />
          )}
          {sectionAffichee === 'votes' && campagne && (
            <Votes campagne={campagne} publies={publies} likes={interactions.likes} votes={votes}
              nbVotants={nbVotants} onPublie={rafraichirCampagnes} onOuvrir={setOuvert} />
          )}
          {sectionAffichee === 'campagne' && (
            <Campagne campagne={campagne} campagnes={campagnes} medias={medias}
              onChange={rafraichirCampagnes} onSelection={id => setCampagneId(id || '')} />
          )}
          {sectionAffichee === 'etudiants' && (
            <Etudiants sortants={sortants} medias={medias} campagne={campagne} onChange={toutRecharger} />
          )}
          {sectionAffichee === 'textes' && <Textes />}
          {sectionAffichee === 'parametres' && <Parametres />}
        </main>
      </div>

      {ouvert && (
        <CartePostale
          media={ouvert}
          nomCampagne={campagnes.find(c => c.id === ouvert.campagneId)?.nom}
          onFermer={fermer}
        />
      )}
      <span className="tb-sr-only">Connecté avec {user?.email}</span>
    </div>
  )
}

// L'Espace RI a sa propre porte d'entrée : le compte de service de l'équipe (email + mot de passe)
export default function Admin() {
  const { user, isAdmin, chargement } = useAuth()
  if (chargement) return <div className="tb-page-centre"><p className="tb-muted">Chargement…</p></div>
  if (!user || !isAdmin) return <AdminConnexion />
  return (
    <CampagnesProvider>
      <TableauDeBord />
    </CampagnesProvider>
  )
}
