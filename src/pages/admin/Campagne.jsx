import { useState } from 'react'
import { addDoc, collection, deleteDoc, doc, updateDoc, writeBatch, Timestamp, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { versInputDate, depuisInputDate } from '../../lib/campagnes'

const VIDE = {
  nom: '', debutDepots: '', finDepots: '', debutVotes: '', finVotes: '',
  nbVotesPhoto: 1, nbVotesVideo: 1, maxPhotos: 1, maxVideos: 1, prix: '',
}

function versFormulaire(c) {
  if (!c) return VIDE
  return {
    nom: c.nom || '',
    debutDepots: versInputDate(c.debutDepots),
    finDepots: versInputDate(c.finDepots),
    debutVotes: versInputDate(c.debutVotes),
    finVotes: versInputDate(c.finVotes),
    nbVotesPhoto: c.nbVotesPhoto || 1,
    nbVotesVideo: c.nbVotesVideo || 1,
    maxPhotos: c.maxPhotos || 1,
    maxVideos: c.maxVideos || 1,
    prix: c.prix || '',
  }
}

const ts = (str, fin) => {
  const d = depuisInputDate(str, fin)
  return d ? Timestamp.fromDate(d) : null
}

function Nombre({ id, name, label, valeur, onChange }) {
  return (
    <div className="tb-champ">
      <label className="tb-label" htmlFor={id}>{label}</label>
      <input id={id} type="number" min="1" max="10" name={name} className="tb-input" value={valeur} onChange={onChange} />
    </div>
  )
}

// Formulaire d'une campagne (création ou modification). Remonté à chaque changement de campagne (prop key).
function FormulaireCampagne({ campagne, campagnes, nbMedias, onEnregistre, onAnnuler }) {
  const nouvelle = !campagne
  const [form, setForm] = useState(() => versFormulaire(campagne))
  const [erreur, setErreur] = useState('')
  const [ok, setOk] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const maj = (e) => {
    const { name, value, type } = e.target
    setForm({ ...form, [name]: type === 'number' ? Math.min(10, Math.max(1, parseInt(value || '1', 10))) : value })
    setErreur(''); setOk('')
  }

  async function enregistrer(e) {
    e.preventDefault()
    if (!form.nom.trim()) return setErreur('Donne un nom à la campagne (ex : S1 2026-27).')
    if (!form.debutDepots || !form.finDepots) return setErreur('Les dates de début et de fin des dépôts sont obligatoires.')
    if (form.finDepots < form.debutDepots) return setErreur('La fin des dépôts doit être après le début.')
    if (!!form.debutVotes !== !!form.finVotes) return setErreur('Renseigne les deux dates de vote, ou aucune pour l’instant.')
    if (form.debutVotes && form.finVotes < form.debutVotes) return setErreur('La fin des votes doit être après le début.')

    const donnees = {
      nom: form.nom.trim(),
      debutDepots: ts(form.debutDepots),
      finDepots: ts(form.finDepots, true),
      debutVotes: ts(form.debutVotes),
      finVotes: ts(form.finVotes, true),
      nbVotesPhoto: form.nbVotesPhoto,
      nbVotesVideo: form.nbVotesVideo,
      maxPhotos: form.maxPhotos,
      maxVideos: form.maxVideos,
      prix: form.prix.trim(),
    }
    setEnvoi(true)
    try {
      if (nouvelle) {
        const ref = await addDoc(collection(db, 'campagnes'), {
          ...donnees,
          active: campagnes.length === 0, // la toute première campagne s'affiche directement sur le site
          resultatsPublies: false,
          resultats: null,
          created_at: serverTimestamp(),
        })
        onEnregistre(ref.id)
      } else {
        await updateDoc(doc(db, 'campagnes', campagne.id), donnees)
        setOk('Modifications enregistrées.')
        onEnregistre(campagne.id)
      }
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnvoi(false)
    }
  }

  async function afficherSurLeSite() {
    const batch = writeBatch(db)
    campagnes.forEach(x => batch.update(doc(db, 'campagnes', x.id), { active: x.id === campagne.id }))
    await batch.commit()
    onEnregistre(campagne.id)
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer la campagne « ${campagne.nom} » ?`)) return
    await deleteDoc(doc(db, 'campagnes', campagne.id))
    onEnregistre(null)
  }

  return (
    <form className="tb-form" onSubmit={enregistrer}>
      <div className="tb-carte-admin">
        <div className="tb-carte-admin__entete">
          <h2 className="tb-h3">{nouvelle ? 'Nouvelle campagne' : 'Informations'}</h2>
          {!nouvelle && campagne.active && <span className="tb-statut tb-statut--publie">Affichée sur le site</span>}
        </div>
        <div className="tb-champ">
          <label className="tb-label" htmlFor="c-nom">Nom de la campagne</label>
          <input id="c-nom" name="nom" className="tb-input" placeholder="Ex : S1 2026-27" value={form.nom} onChange={maj} />
        </div>
      </div>

      <div className="tb-carte-admin">
        <h2 className="tb-h3">Dates</h2>
        <div className="tb-calendrier">
          <fieldset className="tb-calendrier__bloc">
            <legend>Dépôts des souvenirs</legend>
            <div className="tb-champ">
              <label className="tb-label" htmlFor="c-dd">Ouverture</label>
              <input id="c-dd" type="date" name="debutDepots" className="tb-input" value={form.debutDepots} onChange={maj} />
            </div>
            <div className="tb-champ">
              <label className="tb-label" htmlFor="c-fd">Clôture (jour inclus)</label>
              <input id="c-fd" type="date" name="finDepots" className="tb-input" value={form.finDepots} onChange={maj} />
            </div>
          </fieldset>
          <fieldset className="tb-calendrier__bloc">
            <legend>Votes des étudiants</legend>
            <div className="tb-champ">
              <label className="tb-label" htmlFor="c-dv">Ouverture</label>
              <input id="c-dv" type="date" name="debutVotes" className="tb-input" value={form.debutVotes} onChange={maj} />
            </div>
            <div className="tb-champ">
              <label className="tb-label" htmlFor="c-fv">Clôture (jour inclus)</label>
              <input id="c-fv" type="date" name="finVotes" className="tb-input" value={form.finVotes} onChange={maj} />
            </div>
          </fieldset>
        </div>
        <p className="tb-note">Les votes peuvent avoir lieu pendant les dépôts ou après. Tu peux laisser les dates de vote vides et les ajouter plus tard.</p>
      </div>

      <div className="tb-carte-admin">
        <h2 className="tb-h3">Règles par étudiant</h2>
        <div className="tb-grille-4">
          <Nombre id="c-mp" name="maxPhotos" label="Photos déposables" valeur={form.maxPhotos} onChange={maj} />
          <Nombre id="c-mv" name="maxVideos" label="Vidéos déposables" valeur={form.maxVideos} onChange={maj} />
          <Nombre id="c-vp" name="nbVotesPhoto" label="Votes photo" valeur={form.nbVotesPhoto} onChange={maj} />
          <Nombre id="c-vv" name="nbVotesVideo" label="Votes vidéo" valeur={form.nbVotesVideo} onChange={maj} />
        </div>
      </div>

      {erreur && <p className="tb-erreur" role="alert">{erreur}</p>}
      {ok && <p className="tb-note" role="status">{ok}</p>}

      <div className="tb-actions">
        <button type="submit" className="tb-btn tb-btn--marine tb-btn--large" disabled={envoi}>
          {envoi ? 'Enregistrement…' : nouvelle ? 'Créer la campagne' : 'Enregistrer'}
        </button>
        {nouvelle && onAnnuler && (
          <button type="button" className="tb-btn tb-btn--contour tb-btn--large" onClick={onAnnuler}>Annuler</button>
        )}
        {!nouvelle && !campagne.active && (
          <button type="button" className="tb-btn tb-btn--contour tb-btn--large" onClick={afficherSurLeSite}>Afficher cette campagne sur le site</button>
        )}
        {!nouvelle && !campagne.active && nbMedias === 0 && (
          <button type="button" className="tb-btn tb-btn--danger tb-btn--large" onClick={supprimer}>Supprimer la campagne</button>
        )}
      </div>
    </form>
  )
}

// Section « Campagne & dates » : réglages de la campagne sélectionnée, ou création d'une nouvelle
export default function Campagne({ campagne, campagnes, medias, onChange, onSelection }) {
  const [creation, setCreation] = useState(false)
  const enCreation = creation || !campagne

  function apresEnregistrement(id) {
    setCreation(false)
    onChange()
    if (id !== undefined) onSelection(id)
  }

  return (
    <section className="tb-admin-section">
      <div className="tb-actions tb-actions--entre">
        <p className="tb-muted">
          {enCreation
            ? 'Remplis les informations du nouveau semestre.'
            : <>Réglages de <strong>{campagne.nom}</strong>. Pour une autre campagne, change de campagne dans le menu à gauche.</>}
        </p>
        {!enCreation && (
          <button type="button" className="tb-btn tb-btn--contour" onClick={() => setCreation(true)}>+ Nouvelle campagne</button>
        )}
      </div>
      <FormulaireCampagne
        key={enCreation ? 'nouvelle' : campagne.id}
        campagne={enCreation ? null : campagne}
        campagnes={campagnes}
        nbMedias={campagne ? medias.filter(m => m.campagneId === campagne.id).length : 0}
        onEnregistre={apresEnregistrement}
        onAnnuler={campagne ? () => setCreation(false) : null}
      />
    </section>
  )
}
