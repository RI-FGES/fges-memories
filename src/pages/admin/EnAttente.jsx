import { useState } from 'react'
import { doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { MOTIFS_REFUS } from '../../lib/motifs'
import LigneMedia from './LigneMedia'

// Petit formulaire affiché sous un souvenir quand on clique sur « Refuser »
function FormulaireRefus({ media, onAnnuler, onValide }) {
  const [motif, setMotif] = useState(MOTIFS_REFUS[0])
  const [precision, setPrecision] = useState('')
  const [envoi, setEnvoi] = useState(false)

  async function valider(e) {
    e.preventDefault()
    if (motif === 'Autre raison' && !precision.trim()) return
    setEnvoi(true)
    try {
      await updateDoc(doc(db, 'medias', media.id), {
        statut: 'refuse',
        motif_refus: motif,
        precision_refus: precision.trim(),
        refuse_le: serverTimestamp(),
      })
      onValide()
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <form className="tb-refus" onSubmit={valider}>
      <p className="tb-label">Pourquoi refuser le souvenir de {media.prenom_nom} ?</p>
      <div className="tb-choix__options">
        {MOTIFS_REFUS.map(m => (
          <label key={m} className={`tb-choix__option ${motif === m ? 'is-actif' : ''}`}>
            <input type="radio" name={`motif-${media.id}`} value={m} checked={motif === m} onChange={() => setMotif(m)} />
            {m}
          </label>
        ))}
      </div>
      <div className="tb-champ">
        <label className="tb-label" htmlFor={`precision-${media.id}`}>
          Message pour l’étudiant {motif === 'Autre raison' ? '(obligatoire)' : '(facultatif)'}
        </label>
        <textarea id={`precision-${media.id}`} className="tb-input tb-textarea" rows={2} maxLength={200}
          placeholder="Ex : la photo est trop sombre, n’hésite pas à en déposer une autre !"
          value={precision} onChange={e => setPrecision(e.target.value)} />
      </div>
      <p className="tb-note">L’étudiant verra ce motif dans « Mon carnet » et pourra déposer un autre souvenir.</p>
      <div className="tb-actions">
        <button type="submit" className="tb-btn tb-btn--danger" disabled={envoi || (motif === 'Autre raison' && !precision.trim())}>
          {envoi ? 'Envoi…' : 'Confirmer le refus'}
        </button>
        <button type="button" className="tb-btn tb-btn--contour" onClick={onAnnuler}>Annuler</button>
      </div>
    </form>
  )
}

// Section « À valider » : dépôts en attente de la campagne affichée, et souvenirs refusés
export default function EnAttente({ enAttente, refuses, sansCampagne, attenteAutres, campagne, onChange, onOuvrir }) {
  const [occupe, setOccupe] = useState(false)
  const [refusOuvert, setRefusOuvert] = useState(null) // id du média en cours de refus
  const [voirRefuses, setVoirRefuses] = useState(false)

  async function accepter(m) {
    await updateDoc(doc(db, 'medias', m.id), { statut: 'accepte', motif_refus: null, precision_refus: null, valide_le: serverTimestamp() })
    onChange()
  }

  async function remettreEnAttente(m) {
    await updateDoc(doc(db, 'medias', m.id), { statut: 'en_attente', motif_refus: null, precision_refus: null })
    onChange()
  }

  async function supprimer(m) {
    if (!window.confirm(`Supprimer définitivement le souvenir de ${m.prenom_nom} ?`)) return
    // Le fichier Cloudinary est supprimé par la Cloud Function, si elle est déployée (voir README)
    await deleteDoc(doc(db, 'medias', m.id))
    onChange()
  }

  async function toutAccepter() {
    if (!window.confirm(`Accepter les ${enAttente.length} dépôts en attente ? Vérifie-les avant !`)) return
    setOccupe(true)
    try {
      const batch = writeBatch(db)
      enAttente.forEach(m => batch.update(doc(db, 'medias', m.id), { statut: 'accepte', valide_le: serverTimestamp() }))
      await batch.commit()
      onChange()
    } finally {
      setOccupe(false)
    }
  }

  // Médias de l'ancienne version du site (sans campagne)
  async function rattacher() {
    if (!campagne) return
    if (!window.confirm(`Rattacher ${sansCampagne.length} ancien(s) média(s) à la campagne « ${campagne.nom} » ?`)) return
    setOccupe(true)
    try {
      const batch = writeBatch(db)
      sansCampagne.forEach(m => batch.update(doc(db, 'medias', m.id), { campagneId: campagne.id }))
      await batch.commit()
      onChange()
    } finally {
      setOccupe(false)
    }
  }

  async function supprimerAnciens() {
    if (!window.confirm(`Supprimer définitivement les ${sansCampagne.length} média(s) de l’ancienne version ?`)) return
    setOccupe(true)
    try {
      const batch = writeBatch(db)
      sansCampagne.forEach(m => batch.delete(doc(db, 'medias', m.id)))
      await batch.commit()
      onChange()
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section className="tb-admin-section">
      {attenteAutres > 0 && (
        <p className="tb-encart tb-encart--info">
          {attenteAutres} dépôt(s) attendent aussi dans d’autres campagnes : change de campagne dans le menu pour les voir.
        </p>
      )}

      {sansCampagne.length > 0 && (
        <div className="tb-encart tb-encart--info">
          <p><strong>{sansCampagne.length} média(s) de l’ancienne version</strong> ne sont rattachés à aucune campagne et n’apparaissent nulle part sur le site.</p>
          <div className="tb-actions">
            {campagne && (
              <button type="button" className="tb-btn tb-btn--marine" onClick={rattacher} disabled={occupe}>
                Rattacher à « {campagne.nom} »
              </button>
            )}
            <button type="button" className="tb-btn tb-btn--danger" onClick={supprimerAnciens} disabled={occupe}>Les supprimer</button>
          </div>
        </div>
      )}

      {enAttente.length === 0 ? (
        <div className="tb-vide">
          <p className="tb-manuscrit">Rien à valider, tout est à jour !</p>
        </div>
      ) : (
        <>
          <div className="tb-actions tb-actions--entre">
            <p className="tb-muted">{enAttente.length} dépôt(s) à valider · clique sur une vignette pour voir le média en grand</p>
            <button type="button" className="tb-btn tb-btn--succes" onClick={toutAccepter} disabled={occupe}>Tout accepter</button>
          </div>
          <div className="tb-admin-liste">
            {enAttente.map(m => (
              <div key={m.id} className="tb-admin-bloc">
                <LigneMedia media={m} accent="attente" onOuvrir={() => onOuvrir(m)} infos={m.email}>
                  <button type="button" className="tb-btn tb-btn--succes" onClick={() => accepter(m)}>Accepter</button>
                  <button type="button" className="tb-btn tb-btn--danger"
                    onClick={() => setRefusOuvert(refusOuvert === m.id ? null : m.id)}>
                    Refuser
                  </button>
                </LigneMedia>
                {refusOuvert === m.id && (
                  <FormulaireRefus media={m} onAnnuler={() => setRefusOuvert(null)}
                    onValide={() => { setRefusOuvert(null); onChange() }} />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {refuses.length > 0 && (
        <div className="tb-carte-admin">
          <div className="tb-actions tb-actions--entre">
            <h2 className="tb-h3">Refusés ({refuses.length})</h2>
            <button type="button" className="tb-lien-discret" onClick={() => setVoirRefuses(!voirRefuses)}>
              {voirRefuses ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          {voirRefuses && (
            <div className="tb-admin-liste">
              {refuses.map(m => (
                <LigneMedia key={m.id} media={m} onOuvrir={() => onOuvrir(m)}
                  infos={`Motif : ${m.motif_refus || '—'}${m.precision_refus ? ` (« ${m.precision_refus} »)` : ''}`}>
                  <button type="button" className="tb-btn tb-btn--contour" onClick={() => remettreEnAttente(m)}>Remettre en attente</button>
                  <button type="button" className="tb-btn tb-btn--danger" onClick={() => supprimer(m)}>Supprimer</button>
                </LigneMedia>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
