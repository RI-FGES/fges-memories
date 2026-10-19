import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { versDate } from '../../lib/campagnes'
import { exporterCSV, toutTelecharger } from './outils'

// Checklist « Fin de campagne » : apparaît dans la vue d'ensemble une fois les votes terminés.
// Les étapes manuelles sont enregistrées sur la campagne (champ finCampagne),
// donc toute l'équipe RI voit la même progression, quel que soit l'ordinateur.
export default function FinCampagne({ campagne, campagnes, deCampagne, publies, likes, votes, allerA, onChange }) {
  const [occupe, setOccupe] = useState('')
  const fait = campagne.finCampagne || {}

  async function cocher(cle, valeur = true) {
    await updateDoc(doc(db, 'campagnes', campagne.id), { [`finCampagne.${cle}`]: valeur })
    onChange()
  }

  async function exporter() {
    exporterCSV(deCampagne, likes, votes, campagne.nom)
    await cocher('export')
  }

  async function telechargerTout() {
    if (!window.confirm(`Télécharger les ${publies.length} souvenirs publiés ? Ton navigateur va enregistrer les fichiers un par un.`)) return
    setOccupe('telechargement')
    try {
      await toutTelecharger(publies)
      await cocher('telechargement')
    } finally {
      setOccupe('')
    }
  }

  // Une campagne plus récente existe-t-elle ? Est-elle affichée sur le site ?
  const finCelle = versDate(campagne.finVotes) || versDate(campagne.finDepots)
  const suivantes = campagnes.filter(c => c.id !== campagne.id && finCelle && versDate(c.debutDepots) > finCelle)
  const suivanteAffichee = suivantes.some(c => c.active)

  const etapes = [
    {
      id: 'laureats',
      texte: 'Publier les lauréats sur le site',
      fait: !!campagne.resultatsPublies,
      action: <button type="button" className="tb-btn tb-btn--contour" onClick={() => allerA('votes')}>Voir les lauréats</button>,
    },
    {
      id: 'export',
      texte: 'Exporter la liste des participants (CSV)',
      fait: !!fait.export,
      action: <button type="button" className="tb-btn tb-btn--contour" onClick={exporter}>Exporter</button>,
    },
    {
      id: 'telechargement',
      texte: `Télécharger les souvenirs publiés (${publies.length}) et les ranger sur le drive du service`,
      fait: !!fait.telechargement,
      action: (
        <button type="button" className="tb-btn tb-btn--contour" onClick={telechargerTout} disabled={!!occupe || !publies.length}>
          {occupe === 'telechargement' ? 'Téléchargement…' : 'Tout télécharger'}
        </button>
      ),
      manuel: true,
    },
    {
      id: 'suivante',
      texte: 'Créer la campagne suivante avec ses dates de dépôt',
      fait: suivantes.length > 0,
      action: <button type="button" className="tb-btn tb-btn--contour" onClick={() => allerA('campagne')}>Créer</button>,
    },
    {
      id: 'affichee',
      texte: 'Afficher la nouvelle campagne sur le site',
      fait: suivanteAffichee,
      action: <button type="button" className="tb-btn tb-btn--contour" onClick={() => allerA('campagne')}>Afficher</button>,
      aide: suivantes.length ? 'Sélectionne la nouvelle campagne dans le menu à gauche, puis « Afficher cette campagne sur le site ».' : null,
    },
    {
      id: 'etudiants',
      texte: 'Mettre à jour la liste des étudiants autorisés (ajouter les nouveaux sortants, retirer les anciens si besoin)',
      fait: !!fait.etudiants,
      action: <button type="button" className="tb-btn tb-btn--contour" onClick={() => allerA('etudiants')}>Ouvrir la liste</button>,
      manuel: true,
    },
  ]
  const nbFaits = etapes.filter(e => e.fait).length

  return (
    <div className="tb-carte-admin tb-fin-campagne">
      <div className="tb-actions tb-actions--entre">
        <h2 className="tb-h3">Fin de campagne</h2>
        <span className={`tb-statut ${nbFaits === etapes.length ? 'tb-statut--publie' : 'tb-statut--attente'}`}>
          {nbFaits} / {etapes.length} étapes
        </span>
      </div>
      {nbFaits === etapes.length && (
        <p className="tb-note">Tout est fait : {campagne.nom} est archivée et reste visible dans son onglet sur le site.</p>
      )}
      <ol className="tb-fin-campagne__liste">
        {etapes.map((e, i) => (
          <li key={e.id} className={e.fait ? 'is-fait' : ''}>
            <span className="tb-fin-campagne__puce" aria-hidden="true">{e.fait ? '✓' : i + 1}</span>
            <div className="tb-fin-campagne__texte">
              <span>{e.texte}</span>
              {e.aide && !e.fait && <span className="tb-muted">{e.aide}</span>}
              {e.manuel && (
                <label className="tb-fin-campagne__case">
                  <input type="checkbox" checked={e.fait} onChange={ev => cocher(e.id, ev.target.checked)} />
                  C’est fait
                </label>
              )}
            </div>
            {!e.fait && e.action}
          </li>
        ))}
      </ol>
    </div>
  )
}
