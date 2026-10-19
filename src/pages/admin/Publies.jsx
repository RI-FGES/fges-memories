import { useMemo, useState } from 'react'
import { doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import LigneMedia from './LigneMedia'
import { telecharger, toutTelecharger, exporterCSV } from './outils'

// Onglet « Publiés » : tout ce qui est visible dans la galerie, avec filtres et actions groupées
export default function Publies({ publies, deCampagne, likes, votes, campagne, onChange, onOuvrir }) {
  const [type, setType] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [pays, setPays] = useState('')
  const [filiere, setFiliere] = useState('')
  const [tri, setTri] = useState('recents')
  const [occupe, setOccupe] = useState('')

  const paysDispo = [...new Set(publies.map(m => m.pays).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'))
  const filieresDispo = [...new Set(publies.map(m => m.filiere).filter(Boolean))].sort()
  const nb = (t) => publies.filter(m => m.type === t).length

  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    const filtres = publies
      .filter(m => type === 'Tous' || m.type === type)
      .filter(m => !pays || m.pays === pays)
      .filter(m => !filiere || m.filiere === filiere)
      .filter(m => !q || `${m.prenom_nom} ${m.email} ${m.titre} ${m.ville} ${m.universite}`.toLowerCase().includes(q))
    if (tri === 'likes') return [...filtres].sort((a, b) => (likes[b.id] || 0) - (likes[a.id] || 0))
    if (tri === 'votes') return [...filtres].sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0))
    return filtres
  }, [publies, type, pays, filiere, recherche, tri, likes, votes])

  const filtreActif = type !== 'Tous' || pays || filiere || recherche

  async function remettreEnAttente(m) {
    await updateDoc(doc(db, 'medias', m.id), { statut: 'en_attente' })
    onChange()
  }

  async function supprimer(m) {
    if (!window.confirm(`Supprimer définitivement le souvenir de ${m.prenom_nom} ?`)) return
    await deleteDoc(doc(db, 'medias', m.id))
    onChange()
  }

  async function toutRecuperer() {
    setOccupe('telechargement')
    try { await toutTelecharger(liste) } finally { setOccupe('') }
  }

  async function toutSupprimer() {
    const cible = filtreActif ? `les ${liste.length} souvenirs affichés (filtres appliqués)` : `TOUS les ${liste.length} souvenirs publiés de « ${campagne.nom} »`
    if (!window.confirm(`⚠️ Supprimer ${cible} ? Action irréversible.`)) return
    if (!window.confirm('Dernière confirmation : supprimer définitivement ?')) return
    setOccupe('suppression')
    try {
      // Un lot Firestore est limité à 500 opérations
      for (let i = 0; i < liste.length; i += 450) {
        const batch = writeBatch(db)
        liste.slice(i, i + 450).forEach(m => batch.delete(doc(db, 'medias', m.id)))
        await batch.commit()
      }
      onChange()
    } finally {
      setOccupe('')
    }
  }

  return (
    <section className="tb-admin-section">
      <div className="tb-filtres">
        <div className="tb-segment" role="group" aria-label="Type">
          {[['Tous', `Tous · ${publies.length}`], ['Photo', `Photos · ${nb('Photo')}`], ['Vidéo', `Vidéos · ${nb('Vidéo')}`]].map(([val, label]) => (
            <button key={val} type="button" aria-pressed={type === val}
              className={`tb-segment__btn ${type === val ? 'is-actif' : ''}`} onClick={() => setType(val)}>
              {label}
            </button>
          ))}
        </div>
        <label className="tb-sr-only" htmlFor="pub-recherche">Rechercher</label>
        <input id="pub-recherche" className="tb-input tb-input--compact" placeholder="Rechercher un étudiant, une ville, une légende…"
          value={recherche} onChange={e => setRecherche(e.target.value)} />
      </div>

      <div className="tb-filtres">
        <label className="tb-sr-only" htmlFor="pub-pays">Pays</label>
        <select id="pub-pays" className="tb-select" value={pays} onChange={e => setPays(e.target.value)}>
          <option value="">Tous les pays</option>
          {paysDispo.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <label className="tb-sr-only" htmlFor="pub-filiere">Filière</label>
        <select id="pub-filiere" className="tb-select" value={filiere} onChange={e => setFiliere(e.target.value)}>
          <option value="">Toutes les filières</option>
          {filieresDispo.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <label className="tb-filtres__tri">
          Trier :
          <select className="tb-select tb-select--discret" value={tri} onChange={e => setTri(e.target.value)}>
            <option value="recents">les plus récents</option>
            <option value="likes">les plus likés</option>
            <option value="votes">les plus votés</option>
          </select>
        </label>
        {filtreActif && (
          <button type="button" className="tb-lien-discret"
            onClick={() => { setType('Tous'); setPays(''); setFiliere(''); setRecherche('') }}>
            Réinitialiser les filtres
          </button>
        )}
      </div>

      <div className="tb-actions tb-actions--entre">
        <p className="tb-muted">{liste.length} souvenir(s) affiché(s)</p>
        <div className="tb-actions">
          <button type="button" className="tb-btn tb-btn--contour" onClick={() => exporterCSV(deCampagne, likes, votes, campagne.nom)}>
            Exporter la liste (CSV)
          </button>
          <button type="button" className="tb-btn tb-btn--contour" onClick={toutRecuperer} disabled={!liste.length || !!occupe}>
            {occupe === 'telechargement' ? 'Téléchargement…' : `Tout télécharger (${liste.length})`}
          </button>
          <button type="button" className="tb-btn tb-btn--danger" onClick={toutSupprimer} disabled={!liste.length || !!occupe}>
            {occupe === 'suppression' ? 'Suppression…' : filtreActif ? `Supprimer l’affichage (${liste.length})` : 'Tout supprimer'}
          </button>
        </div>
      </div>

      {liste.length === 0 ? (
        <p className="tb-muted">Aucun souvenir publié ne correspond.</p>
      ) : (
        <div className="tb-admin-liste">
          {liste.map(m => (
            <LigneMedia key={m.id} media={m} onOuvrir={() => onOuvrir(m)}
              compteurs={{ likes: likes[m.id] || 0, votes: votes[m.id] || 0 }}>
              <button type="button" className="tb-btn tb-btn--contour" onClick={() => telecharger(m)}>Télécharger</button>
              <button type="button" className="tb-btn tb-btn--contour" onClick={() => remettreEnAttente(m)}>Dépublier</button>
              <button type="button" className="tb-btn tb-btn--danger" onClick={() => supprimer(m)}>Supprimer</button>
            </LigneMedia>
          ))}
        </div>
      )}
    </section>
  )
}
