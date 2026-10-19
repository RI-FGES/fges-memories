import { useMemo, useState } from 'react'
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { emailAutorise } from '../../auth/contexte'
import { versDate } from '../../lib/campagnes'
import { telechargerCSV } from './outils'

const REGEX_EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
const PAR_LOT = 400 // Firestore accepte 500 écritures max par lot

// Repère toutes les adresses dans un texte collé (colonne Excel, liste, export…)
function extraireEmails(texte) {
  return [...new Set((texte.match(REGEX_EMAIL) || []).map(e => e.toLowerCase()))]
}

async function ecrireParLots(elements, appliquer) {
  for (let i = 0; i < elements.length; i += PAR_LOT) {
    const batch = writeBatch(db)
    elements.slice(i, i + PAR_LOT).forEach(e => appliquer(batch, e))
    await batch.commit()
  }
}

// Section « Étudiants autorisés » : la liste des étudiants en échange qui ont accès à la plateforme
export default function Etudiants({ sortants, medias, campagne, onChange }) {
  const [texte, setTexte] = useState('')
  const [groupe, setGroupe] = useState(campagne?.nom || '')
  const [filtreGroupe, setFiltreGroupe] = useState('')
  const [recherche, setRecherche] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [message, setMessage] = useState('')

  const dejaInscrits = useMemo(() => new Set(sortants.map(s => s.id)), [sortants])
  const detectes = extraireEmails(texte)
  const nouveaux = detectes.filter(e => !dejaInscrits.has(e))
  const horsUniversite = nouveaux.filter(e => !emailAutorise(e))

  // Nombre de souvenirs déposés par adresse (toutes campagnes)
  const depots = useMemo(() => {
    const n = {}
    medias.forEach(m => { const e = (m.email || '').toLowerCase(); if (e) n[e] = (n[e] || 0) + 1 })
    return n
  }, [medias])

  const groupes = [...new Set(sortants.map(s => s.groupe).filter(Boolean))].sort()
  const visibles = sortants
    .filter(s => !filtreGroupe || s.groupe === filtreGroupe)
    .filter(s => !recherche || s.id.includes(recherche.trim().toLowerCase()))
    .sort((a, b) => a.id.localeCompare(b.id))
  const sansDepot = visibles.filter(s => !depots[s.id])

  async function ajouter(e) {
    e.preventDefault()
    if (nouveaux.length === 0) return
    setOccupe(true); setMessage('')
    try {
      await ecrireParLots(nouveaux, (batch, email) => batch.set(doc(db, 'sortants', email), {
        email, groupe: groupe.trim(), ajoute_le: serverTimestamp(),
      }))
      setMessage(`${nouveaux.length} étudiant(s) ajouté(s).`)
      setTexte('')
      onChange()
    } catch (err) {
      setMessage(`Erreur : ${err.message}`)
    } finally {
      setOccupe(false)
    }
  }

  async function retirer(s) {
    if (!window.confirm(`Retirer ${s.id} ? Cette personne ne pourra plus se connecter (ses souvenirs restent en ligne).`)) return
    await ecrireParLots([s], (batch, x) => batch.delete(doc(db, 'sortants', x.id)))
    onChange()
  }

  async function retirerVisibles() {
    const nom = filtreGroupe ? `du groupe « ${filtreGroupe} »` : 'affichés'
    if (!window.confirm(`Retirer les ${visibles.length} étudiants ${nom} ? Ils ne pourront plus se connecter (leurs souvenirs restent en ligne).`)) return
    setOccupe(true)
    try {
      await ecrireParLots(visibles, (batch, x) => batch.delete(doc(db, 'sortants', x.id)))
      onChange()
    } finally {
      setOccupe(false)
    }
  }

  function exporter(liste, suffixe) {
    telechargerCSV(
      [['Email', 'Groupe', 'Souvenirs déposés', 'Ajouté le'],
        ...liste.map(s => [s.id, s.groupe || '', depots[s.id] || 0, versDate(s.ajoute_le)?.toLocaleDateString('fr-FR') || ''])],
      `fges-memories-etudiants-${suffixe}.csv`,
    )
  }

  return (
    <section className="tb-admin-section">
      <p className="tb-encart tb-encart--info">
        Seuls les étudiants de cette liste peuvent se connecter au site, déposer, liker et voter.
        Ajoute les étudiants sortants au début de chaque semestre. Les retirer ne supprime pas leurs souvenirs.
      </p>

      <form className="tb-carte-admin tb-form" onSubmit={ajouter}>
        <h2 className="tb-h3">Ajouter des étudiants</h2>
        <div className="tb-champ">
          <label className="tb-label" htmlFor="etu-liste">Adresses email</label>
          <textarea id="etu-liste" className="tb-input tb-textarea" rows={6} value={texte}
            onChange={e => { setTexte(e.target.value); setMessage('') }}
            placeholder={'Colle ici une colonne Excel, une liste d’adresses ou même un tableau entier :\nles adresses sont repérées automatiquement.'} />
          {detectes.length > 0 && (
            <p className="tb-note">
              {detectes.length} adresse(s) repérée(s) · <strong>{nouveaux.length} nouvelle(s)</strong>
              {detectes.length - nouveaux.length > 0 ? ` · ${detectes.length - nouveaux.length} déjà sur la liste` : ''}
            </p>
          )}
          {horsUniversite.length > 0 && (
            <p className="tb-erreur">
              Attention, {horsUniversite.length} adresse(s) hors université : {horsUniversite.slice(0, 3).join(', ')}{horsUniversite.length > 3 ? '…' : ''}.
              Ces étudiants ne pourront pas recevoir de lien de connexion.
            </p>
          )}
        </div>
        <div className="tb-champ">
          <label className="tb-label" htmlFor="etu-groupe">Groupe</label>
          <input id="etu-groupe" className="tb-input" value={groupe} onChange={e => setGroupe(e.target.value)}
            placeholder="Ex : S1 2026-27, Année 2026-27…" />
          <p className="tb-note">Pour t’y retrouver : semestre de départ, année complète…</p>
        </div>
        {message && <p className="tb-note" role="status">{message}</p>}
        <div className="tb-actions">
          <button type="submit" className="tb-btn tb-btn--marine" disabled={occupe || nouveaux.length === 0}>
            {occupe ? 'Ajout…' : `Ajouter ${nouveaux.length || ''} étudiant(s)`}
          </button>
        </div>
      </form>

      <div className="tb-carte-admin">
        <div className="tb-actions tb-actions--entre">
          <h2 className="tb-h3">Liste ({sortants.length})</h2>
          <div className="tb-actions">
            <button type="button" className="tb-btn tb-btn--contour" onClick={() => exporter(visibles, 'liste')} disabled={!visibles.length}>
              Exporter (CSV)
            </button>
            <button type="button" className="tb-btn tb-btn--contour" onClick={() => exporter(sansDepot, 'sans-depot')} disabled={!sansDepot.length}>
              Exporter ceux qui n’ont rien déposé ({sansDepot.length})
            </button>
          </div>
        </div>

        <div className="tb-filtres">
          <label className="tb-sr-only" htmlFor="etu-recherche">Rechercher</label>
          <input id="etu-recherche" className="tb-input tb-input--compact" placeholder="Rechercher une adresse…"
            value={recherche} onChange={e => setRecherche(e.target.value)} />
          {groupes.length > 0 && (
            <>
              <label className="tb-sr-only" htmlFor="etu-filtre">Groupe</label>
              <select id="etu-filtre" className="tb-select" value={filtreGroupe} onChange={e => setFiltreGroupe(e.target.value)}>
                <option value="">Tous les groupes</option>
                {groupes.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </>
          )}
        </div>

        {visibles.length === 0 ? (
          <p className="tb-muted">{sortants.length === 0 ? 'Aucun étudiant pour l’instant : personne ne peut se connecter.' : 'Aucun résultat.'}</p>
        ) : (
          <>
            <ul className="tb-liste-etudiants">
              {visibles.map(s => (
                <li key={s.id}>
                  <span className="tb-liste-etudiants__email">{s.id}</span>
                  <span className="tb-muted">{s.groupe || '—'}</span>
                  <span className={depots[s.id] ? 'tb-statut tb-statut--publie' : 'tb-statut tb-statut--attente'}>
                    {depots[s.id] ? `${depots[s.id]} souvenir(s)` : 'Aucun dépôt'}
                  </span>
                  <button type="button" className="tb-lien-danger" onClick={() => retirer(s)}>Retirer</button>
                </li>
              ))}
            </ul>
            <div className="tb-actions">
              <button type="button" className="tb-btn tb-btn--danger" onClick={retirerVisibles} disabled={occupe}>
                Retirer les {visibles.length} étudiants affichés
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
