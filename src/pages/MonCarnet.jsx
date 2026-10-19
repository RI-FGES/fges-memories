import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth/contexte'
import { useCampagnes, phaseCampagne } from '../lib/campagnes'
import Polaroid from '../components/Polaroid'
import Mur from '../components/Mur'
import CartePostale from '../components/CartePostale'
import BoutonCarte from '../components/BoutonCarte'
import { lireDerniereVisite, marquerCarnetVu, estNouveau } from '../lib/nouveautes'

// Mêmes limites qu'au dépôt (et que dans les règles Firebase)
const MAX_LEGENDE = 60
const MAX_CAPTION = 150

const STATUTS = {
  en_attente: { label: 'En attente de validation', classe: 'tb-statut--attente' },
  accepte: { label: 'Publié dans la galerie', classe: 'tb-statut--publie' },
  refuse: { label: 'Refusé', classe: 'tb-statut--refuse' },
}

async function lireMesMedias(uid) {
  const snap = await getDocs(query(collection(db, 'medias'), where('uid', '==', uid)))
  const liste = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return liste.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

// Correction de la légende et du petit texte, tant que le souvenir n'est pas encore validé
function FormulaireLegende({ media, onAnnuler, onEnregistre }) {
  const [titre, setTitre] = useState(media.titre || '')
  const [caption, setCaption] = useState(media.caption || '')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  async function enregistrer(e) {
    e.preventDefault()
    if (!titre.trim()) return setErreur('La légende ne peut pas être vide.')
    setEnvoi(true)
    setErreur('')
    try {
      const modifs = { titre: titre.trim().slice(0, MAX_LEGENDE), caption: caption.trim().slice(0, MAX_CAPTION) }
      await updateDoc(doc(db, 'medias', media.id), modifs)
      onEnregistre(modifs)
    } catch (err) {
      setErreur(err?.code === 'permission-denied'
        ? 'Ce souvenir vient d’être validé : il ne peut plus être modifié. Écris au service RI si besoin.'
        : `Enregistrement impossible : ${err.message}`)
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <form className="tb-form tb-edition-legende" onSubmit={enregistrer}>
      <div className="tb-champ">
        <label className="tb-label" htmlFor={`titre-${media.id}`}>Légende</label>
        <input id={`titre-${media.id}`} className="tb-input" maxLength={MAX_LEGENDE}
          value={titre} onChange={e => { setTitre(e.target.value); setErreur('') }} required />
      </div>
      <div className="tb-champ">
        <label className="tb-label" htmlFor={`caption-${media.id}`}>Raconte ton souvenir <span className="tb-muted">(facultatif)</span></label>
        <textarea id={`caption-${media.id}`} className="tb-input tb-textarea" rows={3} maxLength={MAX_CAPTION}
          value={caption} onChange={e => setCaption(e.target.value)} />
        <p className={`tb-compteur ${caption.length >= MAX_CAPTION - 10 ? 'is-limite' : ''}`}>{caption.length} / {MAX_CAPTION}</p>
      </div>
      {erreur && <p className="tb-erreur" role="alert">{erreur}</p>}
      <div className="tb-actions">
        <button type="submit" className="tb-btn tb-btn--marine" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button type="button" className="tb-btn tb-btn--contour" onClick={onAnnuler}>Annuler</button>
      </div>
    </form>
  )
}

// L'espace personnel de l'étudiant : ses dépôts et leur statut
export default function MonCarnet() {
  const { user, deconnexion } = useAuth()
  const { campagnes } = useCampagnes()
  const [medias, setMedias] = useState([])
  const [chargement, setChargement] = useState(true)
  const [ouvert, setOuvert] = useState(null)
  const [edition, setEdition] = useState(null) // id du souvenir dont on corrige la légende
  const fermer = useCallback(() => setOuvert(null), [])
  // Date de la visite précédente, lue une seule fois : sert à signaler ce qui a changé depuis
  const [visitePrecedente] = useState(() => lireDerniereVisite(user.uid))
  useEffect(() => { marquerCarnetVu(user.uid) }, [user.uid])

  const charger = useCallback(() => lireMesMedias(user.uid)
    .then(setMedias)
    .catch(console.error)
    .finally(() => setChargement(false)), [user.uid])

  useEffect(() => {
    lireMesMedias(user.uid)
      .then(setMedias)
      .catch(console.error)
      .finally(() => setChargement(false))
  }, [user.uid])

  async function retirer(m) {
    const texte = m.statut === 'refuse'
      ? `Retirer « ${m.titre} » de ton carnet ?`
      : `Retirer « ${m.titre} » ? Tu pourras en déposer un autre.`
    if (!window.confirm(texte)) return
    await deleteDoc(doc(db, 'medias', m.id))
    charger()
  }

  function apresEdition(id, modifs) {
    setMedias(liste => liste.map(m => (m.id === id ? { ...m, ...modifs } : m)))
    setEdition(null)
  }

  const nomCampagne = (id) => campagnes.find(c => c.id === id)?.nom
  const depotsOuverts = (id) => {
    const c = campagnes.find(x => x.id === id)
    return !!c?.active && phaseCampagne(c).depotsOuverts
  }

  return (
    <div className="tb-page">
      <div className="tb-page__entete">
        <div>
          <h1 className="tb-h1">Mon carnet</h1>
          <p className="tb-muted">{user.email}</p>
        </div>
        <button type="button" className="tb-btn tb-btn--contour" onClick={deconnexion}>Se déconnecter</button>
      </div>

      {chargement ? (
        <p className="tb-muted">Chargement…</p>
      ) : medias.length === 0 ? (
        <div className="tb-vide">
          <p className="tb-manuscrit">Ton carnet est encore vide.</p>
          <Link to="/deposer" className="tb-btn tb-btn--corail">Coller mon premier souvenir</Link>
        </div>
      ) : (
        <Mur>
          {medias.map(m => {
            const statut = STATUTS[m.statut] || STATUTS.en_attente
            const enAttente = m.statut !== 'accepte' && m.statut !== 'refuse'
            return (
              <div key={m.id} className="tb-carnet__item">
                <Polaroid media={m} onOuvrir={() => setOuvert(m)} />
                <div className="tb-carnet__infos">
                  {estNouveau(m, visitePrecedente) && <span className="tb-nouveau">Nouveau</span>}
                  <span className={`tb-statut ${statut.classe}`}>{statut.label}</span>
                  {nomCampagne(m.campagneId) && <span className="tb-muted">{nomCampagne(m.campagneId)}</span>}
                  {enAttente && edition !== m.id && (
                    <button type="button" className="tb-lien-discret" onClick={() => setEdition(m.id)}>Modifier la légende</button>
                  )}
                  {m.statut !== 'accepte' && (
                    <button type="button" className="tb-lien-danger" onClick={() => retirer(m)}>Retirer</button>
                  )}
                </div>
                {enAttente && edition === m.id && (
                  <FormulaireLegende media={m} onAnnuler={() => setEdition(null)}
                    onEnregistre={modifs => apresEdition(m.id, modifs)} />
                )}
                {m.statut === 'refuse' && (
                  <div className="tb-refus-etudiant">
                    <p><strong>Motif :</strong> {m.motif_refus || 'non précisé'}</p>
                    {m.precision_refus && <p className="tb-manuscrit">« {m.precision_refus} »</p>}
                    <p className="tb-muted">Sa place est libérée : tu peux déposer un autre souvenir tant que les dépôts sont ouverts.</p>
                    {depotsOuverts(m.campagneId) && (
                      <Link to="/deposer" className="tb-btn tb-btn--corail">Déposer un autre souvenir</Link>
                    )}
                  </div>
                )}
                {m.statut === 'accepte' && (
                  <BoutonCarte media={m} nomCampagne={nomCampagne(m.campagneId)} />
                )}
              </div>
            )
          })}
        </Mur>
      )}

      {ouvert && (
        <CartePostale media={ouvert} nomCampagne={nomCampagne(ouvert.campagneId)} onFermer={fermer}
          telechargeable={ouvert.statut === 'accepte'} />
      )}
    </div>
  )
}
